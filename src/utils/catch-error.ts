/* eslint-disable promise/prefer-await-to-then, promise/prefer-await-to-callbacks */

/**
 * this util tries to solve scoping issue of try catch
 * @param promise - async function
 * @param errors
 * @returns
 *
 * @example
 * const [error, user] = await catchError(getUser(1), [CustomError])
 * if (error) return toast.error(error.message)
 * toast.success(user.name)
 */

export default function catchError<T, E extends new (message?: string) => Error>(
  promise: Promise<T>,
  errors?: E[],
): Promise<[undefined, T] | [InstanceType<E>]> {
  return promise
    .then((data) => [undefined, data] as [undefined, T])
    .catch((error) => {
      if (errors === undefined || errors.some((e) => error instanceof e))
        return [error as InstanceType<E>]
      throw error
    })
}
