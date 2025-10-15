import { Injectable, Logger, OnModuleDestroy, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as Y from 'yjs';
import { CanvasDocument } from './canvas.schema';
import { Buffer } from 'buffer';
import axios from 'axios';
import { BoardRole } from './type';

@Injectable()
export class CanvasService implements OnModuleDestroy {
  private readonly logger = new Logger(CanvasService.name);
  private readonly docs: Map<string, Y.Doc> = new Map();
  // Persistence timers to prevent excessive DB writes
  private readonly persistenceIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly PERSISTENCE_DELAY_MS = 5000; // Save state to DB every 5 seconds of activity
  private readonly API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:4001';

  constructor(
    @InjectModel('Canvas', 'canvasConnection')
    private readonly canvasModel: Model<CanvasDocument>,
  ) { }

  onModuleDestroy() {
    this.persistenceIntervals.forEach(clearInterval);
  }

  // --- Persistence Handlers ---

  private async loadFromDatabase(boardId: string): Promise<Uint8Array | undefined> {
    const canvasDoc = await this.canvasModel.findOne({ boardId }).exec();
    return canvasDoc?.state;
  }

  private async saveToDatabase(boardId: string, doc: Y.Doc): Promise<void> {
    // Encode the full state as an update (most efficient full snapshot)
    const fullState = Y.encodeStateAsUpdate(doc);

    await this.canvasModel.updateOne(
      { boardId },
      {
        $set: {
          boardId,
          state: Buffer.from(fullState),
          lastUpdate: new Date(),
        }
      },
      { upsert: true }
    );
    this.logger.debug(`Persisted full state for board ${boardId}. Size: ${fullState.length} bytes`);
  }

  private setupPersistenceHook(boardId: string, doc: Y.Doc): void {
    let activityTimer: NodeJS.Timeout | null = null;

    doc.on('update', () => {
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
      activityTimer = setTimeout(() => {
        this.saveToDatabase(boardId, doc).catch(e => {
          this.logger.error(`Failed to persist document ${boardId}: ${e.message}`);
        });
        activityTimer = null;
      }, this.PERSISTENCE_DELAY_MS);
    });

    this.persistenceIntervals.set(boardId, activityTimer as any);
  }


  // --- Public Yjs Document Management ---

  /**
   * Gets or creates the Y.Doc, loads initial state from DB, and attaches the persistence hook.
   */
  async getOrCreateBoardDocument(boardId: string): Promise<Y.Doc> {
    if (this.docs.has(boardId)) {
      return this.docs.get(boardId) as Y.Doc;
    }

    const doc = new Y.Doc();
    this.docs.set(boardId, doc);

    const persistedState = await this.loadFromDatabase(boardId);
    if (persistedState) {
      // Apply the initial state (the full snapshot)
      Y.applyUpdate(doc, persistedState, this);
    }

    this.setupPersistenceHook(boardId, doc);

    return doc;
  }

  /**
   * Fetches the initial Yjs state for a new client connection.
   */
  async getInitialState(boardId: string): Promise<Uint8Array> {
    const doc = await this.getOrCreateBoardDocument(boardId);
    // Y.encodeStateAsUpdate gets the full state of the document
    return Y.encodeStateAsUpdate(doc);
  }

  /**
   * Applies a Yjs update received from the Realtime Service (from a client).
   */
  async applyUpdate(boardId: string, update: Buffer): Promise<boolean> {
    const doc = await this.getOrCreateBoardDocument(boardId); // Ensure the doc is loaded
    try {
      // Apply the update. `this` (the CanvasService) is passed as the origin 
      // for the Realtime Gateway to ignore broadcasting it back.
      Y.applyUpdate(doc, new Uint8Array(update), this);
      return true;
    } catch (e) {
      this.logger.error(`Failed to apply Yjs update for board ${boardId}: ${e.message}`);
      return false;
    }
  }

  /**
   * Converts the Y.Doc content into a structured JSON object for export/download.
   */
  async getCanvasDataAsJson(boardId: string): Promise<any> {
    const doc = await this.getOrCreateBoardDocument(boardId);

    // Convert the entire root structure to a JSON object
    // Assuming the collaborative data is held in a root Y.Map or Y.Array
    const rootMap = doc.getMap('elements');

    return rootMap ? rootMap.toJSON() : { elements: [] };
  }

  // --- Utility for HTTP Endpoint Permission Check ---

  async checkDownloadPermission(boardId: string, userId: string, authToken: string): Promise<void> {
    try {
      const authRes = await axios.get<{ role: BoardRole }>(
        `${this.API_GATEWAY_URL}/boards/${boardId}/membership`, // Check against Board Service via Gateway
        {
          headers: {
            'Authorization': authToken,
            'x-user-id': userId,
          },
        }
      );
      const memberRole = authRes.data.role;

      // Permission Check: Only Owner and Editor can download/export
      if (memberRole !== BoardRole.OWNER && memberRole !== BoardRole.EDITOR) {
        throw new HttpException(
          'Insufficient permissions. Only Owner and Editor can download/export board data.',
          HttpStatus.FORBIDDEN,
        );
      }
    } catch (e) {
      this.logger.error(`Permission check failed for user ${userId} on board ${boardId}: ${e.message}`);
      throw new HttpException(
        e.response?.data?.message || 'Access check failed.',
        e.response?.status || HttpStatus.FORBIDDEN,
      );
    }
  }
}