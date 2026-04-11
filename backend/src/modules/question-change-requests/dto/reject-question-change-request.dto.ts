import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RejectQuestionChangeRequestDto {
  @ApiProperty({
    description: 'Причина отклонения',
    maxLength: 2000,
    example: 'Слишком общая формулировка и дублирующийся тег.',
  })
  @IsString()
  @MaxLength(2000)
  reviewComment!: string;
}
