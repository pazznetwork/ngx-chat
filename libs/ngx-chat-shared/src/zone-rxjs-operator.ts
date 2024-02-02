// SPDX-License-Identifier: MIT
import { NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';

export function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
  return (source$) => {
    return new Observable((observer) => {
      const next = (value: T): void => zone.run(() => observer.next(value));
      const error = (e: unknown): void => zone.run(() => observer.error(e));
      const complete = (): void => zone.run(() => observer.complete());
      return source$.subscribe({ next, error, complete });
    });
  };
}
