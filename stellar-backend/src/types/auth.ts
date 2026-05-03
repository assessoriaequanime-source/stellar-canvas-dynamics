export interface JwtAccessPayload {
  sub: string;
  walletAddress: string;
  type: "access";
}

export interface JwtRefreshPayload {
  sub: string;
  type: "refresh";
  sessionId: string;
}

export interface AuthenticatedUser {
  userId: string;
  walletAddress: string;
}

export interface ChallengeResponse {
  walletAddress: string;
  challenge: string;
  expiresAt: string;
}

export interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    walletAddress: string;
  };
}
