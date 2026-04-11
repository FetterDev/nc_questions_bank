import { ApiProperty } from '@nestjs/swagger';

export class QuestionCompanyDto {
  @ApiProperty({ example: 'cm7y5z8qv0003x4f2w7sn1abc' })
  id!: string;

  @ApiProperty({ example: 'Google' })
  name!: string;
}
