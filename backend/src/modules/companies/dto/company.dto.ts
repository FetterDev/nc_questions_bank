import { ApiProperty } from '@nestjs/swagger';

export class CompanyDto {
  @ApiProperty({ example: 'cm7y5z8qv0003x4f2w7sn1abc' })
  id!: string;

  @ApiProperty({ example: 'Google' })
  name!: string;

  @ApiProperty({ example: 12 })
  questionsCount!: number;
}
