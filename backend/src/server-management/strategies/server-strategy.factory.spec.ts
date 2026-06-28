import { ServerStrategyFactory } from './server-strategy.factory';
import { JavaServerStrategy } from './java-server.strategy';
import { BedrockServerStrategy } from './bedrock-server.strategy';

describe('ServerStrategyFactory', () => {
  it('should create a Java strategy for JAVA edition', () => {
    expect(ServerStrategyFactory.create('JAVA')).toBeInstanceOf(JavaServerStrategy);
  });

  it('should create a Bedrock strategy for BEDROCK edition', () => {
    expect(ServerStrategyFactory.create('BEDROCK')).toBeInstanceOf(BedrockServerStrategy);
  });

  it('should default to Java when no edition is provided', () => {
    expect(ServerStrategyFactory.create()).toBeInstanceOf(JavaServerStrategy);
  });

  it('should reuse the same strategy instance across calls', () => {
    expect(ServerStrategyFactory.create('JAVA')).toBe(ServerStrategyFactory.create('JAVA'));
    expect(ServerStrategyFactory.create('BEDROCK')).toBe(ServerStrategyFactory.create('BEDROCK'));
  });

  it('should expose the supported editions', () => {
    expect(ServerStrategyFactory.getEditions()).toEqual(['JAVA', 'BEDROCK']);
  });
});
