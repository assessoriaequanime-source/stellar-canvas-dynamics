export type AvatarAudioPayload = {
  audioUrl?: string;
  audioBase64?: string;
  contentType?: string;
};

export type AvatarMessageExtendedResponse = {
  ok: boolean;
  text?: string;
  reply?: string;
  audio?: AvatarAudioPayload;
};
