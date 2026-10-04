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

  it('should keep a custom env var whose value contains an equals sign', () => {
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
      envVars: 'SOME_FLAG=-Dfoo=bar=baz',
    } as ServerConfig);

    expect(env.SOME_FLAG).toBe('-Dfoo=bar=baz');
  });

  it('should default to the RakNet transport and let a custom env var override it', () => {
    const config = {
      id: 'bedrock-test',
      edition: 'BEDROCK',
      serverType: 'VANILLA',
      serverName: 'Bedrock Test',
      difficulty: 'normal',
      maxPlayers: '10',
      onlineMode: true,
      gameMode: 'survival',
      viewDistance: '10',
    } as ServerConfig;

    expect(strategy.buildEnvironment(config).TRANSPORT).toBe('raknet');
    expect(strategy.buildEnvironment({ ...config, envVars: 'TRANSPORT=nethernet' }).TRANSPORT).toBe('nethernet');
  });
});
