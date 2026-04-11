import { ApiProperty } from '@nestjs/swagger';
import { MeDto } from '../../users/dto/me.dto';

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ type: MeDto })
  profile!: MeDto;
}
