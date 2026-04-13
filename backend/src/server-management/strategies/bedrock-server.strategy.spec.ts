import { ServerConfig } from '../dto/server-config.model';
import { BedrockServerStrategy } from './bedrock-server.strategy';

describe('BedrockServerStrategy', () => {
  const strategy = new BedrockServerStrategy();

  it('should include LEVEL_NAME when worldLevelName is configured', () => {
    const env = strategy.buildEnvironment({
      id: 'bedrock-test',
      edition: 'BEDROCK',
      serverType: 'VANILLA',
      serverName: 'Bedrock Test',
      difficulty: 'normal',
      maxPlayers: '10',
      onlineMode: true,
      gameMode: 'survival',
      viewDistance: '10',
      worldLevelName: 'world',
    } as ServerConfig);

    expect(env.LEVEL_NAME).toBe('world');
  });
});
