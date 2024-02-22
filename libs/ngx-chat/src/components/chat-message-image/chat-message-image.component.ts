// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Input, OnInit } from '@angular/core';
import { extractUrls } from '@pazznetwork/ngx-chat-shared';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  filter,
  finalize,
  map,
  merge,
  Observable,
  race,
  ReplaySubject,
  switchMap,
  take,
} from 'rxjs';
import { CommonModule, NgOptimizedImage } from '@angular/common';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

@Component({
  standalone: true,
  imports: [CommonModule, HttpClientModule, NgOptimizedImage],
  selector: 'ngx-chat-message-image',
  templateUrl: './chat-message-image.component.html',
  styleUrls: ['./chat-message-image.component.less'],
})
export class ChatMessageImageComponent implements OnInit {
  @Input()
  textContent?: string;

  private readonly candidateUrlsSubject = new ReplaySubject<string[]>(1);
  imageLink$: Observable<string> = this.candidateUrlsSubject.pipe(
    switchMap((urls) =>
      race(
        merge(
          ...urls.map((url) =>
            this.httpClient.head(url, { observe: 'response' }).pipe(
              map((headRequest): { isImage?: boolean; contentLength?: number; url?: string } => {
                const contentType = headRequest.headers.get('Content-Type');
                const isImage = contentType?.startsWith('image');
                const length = headRequest.headers.get('Content-Length');
                const contentLength = length ? parseInt(length, 10) : 0;
                return { isImage, contentLength, url };
              }),
              filter(({ isImage, contentLength, url: imageUrl }): boolean => {
                const showImage =
                  !!isImage && !!imageUrl && !!contentLength && contentLength < MAX_IMAGE_SIZE;
                if (!showImage) {
                  this.checkedHttpLinksSubject.next();
                }
                return showImage;
              }),
              map((image) => image.url ?? '')
            )
          )
        ).pipe(take(1)),
        this.checkedHttpLinksSubject.pipe(
          take(urls.length),
          finalize(() => this.showImagePlaceholderSubject.next(false)),
          map(() => '')
        )
      )
    )
  );

  private readonly showImagePlaceholderSubject = new ReplaySubject<boolean>(1);
  showImagePlaceholder$ = this.showImagePlaceholderSubject.asObservable();

  showImage$ = merge(this.imageLink$.pipe(map((link) => !!link)));

  private readonly checkedHttpLinksSubject = new ReplaySubject<void>(1);

  constructor(private httpClient: HttpClient) {}

  ngOnInit(): void {
    if (!this.textContent) {
      this.showImagePlaceholderSubject.next(false);
      return;
    }
    const candidateUrlsRegexArray = extractUrls(this.textContent);

    if (candidateUrlsRegexArray.length === 0) {
      this.showImagePlaceholderSubject.next(false);
      return;
    }
    const candidateUrls = candidateUrlsRegexArray.map((regex) => regex.toString());

    this.candidateUrlsSubject.next(candidateUrls);
  }

  afterImageLoaded(): void {
    this.showImagePlaceholderSubject.next(false);
  }
}
