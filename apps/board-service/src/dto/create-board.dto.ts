import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  title!: string;
}
