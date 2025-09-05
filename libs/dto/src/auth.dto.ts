// libs/dto/src/auth.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsString,
  ValidateIf,
  Equals,
  Length,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Name is required.' })
  @IsString({ message: 'Name must be a string.' })
  @MinLength(2, { message: 'Name must be at least 2 characters long.' })
  @MaxLength(50, { message: 'Name cannot be longer than 50 characters.' })
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'Name can only contain letters and spaces.',
  })
  name: string;

  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/(?=.*[a-z])/, {
    message: 'Password must contain at least one lowercase letter.',
  })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter.',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Password must contain at least one number.',
  })
  @Matches(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'Password must contain at least one special character.',
  })
  password: string;

  // Simple, manual confirmation check
  @IsNotEmpty({ message: 'Please confirm your password.' })
  @ValidateIf((o) => o.password === o.confirmPassword, {
    message: 'Passwords do not match.',
  })
  confirmPassword: string;
}

export class LoginDto {
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}

export class VerifyEmailDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code: string;
}
