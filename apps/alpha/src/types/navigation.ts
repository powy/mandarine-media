export type RootStackParamList = {
  Login: undefined;
  Welcome: undefined;
  DebugGet: undefined;
  Content: { screenContentId: string };
  Video: { mediaId: string };
  Error: { message: string };
};