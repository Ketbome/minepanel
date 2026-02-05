import { BedrockServerStrategy } from './bedrock-server.strategy';
import { JavaServerStrategy } from './java-server.strategy';
import { IServerStrategy, ServerEdition } from './server-strategy.interface';

export class ServerStrategyFactory {
  private static readonly javaStrategy = new JavaServerStrategy();
  private static readonly bedrockStrategy = new BedrockServerStrategy();

  static create(edition: ServerEdition = 'JAVA'): IServerStrategy {
    switch (edition) {
      case 'BEDROCK':
        return this.bedrockStrategy;
      case 'JAVA':
      default:
        return this.javaStrategy;
    }
  }

  static getEditions(): ServerEdition[] {
    return ['JAVA', 'BEDROCK'];
  }
}
