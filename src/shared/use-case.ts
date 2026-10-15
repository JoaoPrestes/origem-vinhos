export interface UseCase<TInput = any, TOutput = any> {
  execute(input?: TInput, ...args: any[]): Promise<TOutput>;
}
