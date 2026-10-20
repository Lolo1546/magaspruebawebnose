export class SessionUserDto {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export class SessionResponseDto {
  user: SessionUserDto;
  csrfToken: string;
}
