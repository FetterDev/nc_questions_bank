import { ApiProperty } from '@nestjs/swagger';

export class StackDto {
  @ApiProperty({ example: 'cm8q4x7r10001stack' })
  id!: string;

  @ApiProperty({ example: 'Frontend' })
  name!: string;

  @ApiProperty({ example: 'frontend' })
  slug!: string;

  @ApiProperty({ example: 8 })
  competenciesCount!: number;
}
