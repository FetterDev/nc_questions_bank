import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateCompetencyDto {
  @ApiProperty({ example: 'cm8q4x7r10001stack' })
  @IsString()
  @Length(1, 191)
  stackId!: string;

  @ApiProperty({ example: 'TypeScript' })
  @IsString()
  @Length(1, 160)
  name!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Static typing and type-system tradeoffs.',
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  position?: number;
}
