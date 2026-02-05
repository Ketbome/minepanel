import { ServerConfig } from '../dto/server-config.model';

export type ServerEdition = 'JAVA' | 'BEDROCK';

export interface IServerStrategy {
  readonly edition: ServerEdition;

  getDockerImage(tag?: string): string;
  getDefaultPort(): string;
  getProtocol(): 'tcp' | 'udp';
  getInternalPort(): string;

  buildEnvironment(config: ServerConfig): Record<string, string>;
  supportsRcon(): boolean;
  supportsBackup(): boolean;
  supportsAutoPause(): boolean;
  supportsAutoStop(): boolean;
  supportsJvmOptions(): boolean;
  supportsProxy(): boolean;
  getServerTypes(): string[];
  getDefaultConfig(id: string): Partial<ServerConfig>;
}
