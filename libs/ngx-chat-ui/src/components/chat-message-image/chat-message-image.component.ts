// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Input, OnInit } from '@angular/core';
import { extractUrls } from '@pazznetwork/ngx-chat-shared';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { filter, finalize, map, merge, Observable, race, Subject, take } from 'rxjs';
import { CommonModule } from '@angular/common';

const MAX_IMAGE_SIZE = 250 * 1024;

@Component({
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  selector: 'ngx-chat-message-image',
  templateUrl: './chat-message-image.component.html',
  styleUrls: ['./chat-message-image.component.less'],
})
export class ChatMessageImageComponent implements OnInit {
  @Input()
  textContent?: string;

  imageLink$?: Observable<string>;

  showImagePlaceholder = true;

  private readonly checkedHttpLinksSubject = new Subject<void>();

  constructor(private httpClient: HttpClient) {}

  ngOnInit(): void {
    this.tryFindImageLink();
  }

  private tryFindImageLink(): void {
    if (!this.textContent) {
      return;
    }
    const candidateUrlsRegexArray = extractUrls(this.textContent);

    if (candidateUrlsRegexArray.length === 0) {
      this.showImagePlaceholder = false;
      return;
    }

    const candidateUrls = candidateUrlsRegexArray.map((regExp) => regExp.toString());

    this.imageLink$ = race(
      merge(
        ...candidateUrls.map((url) =>
          this.httpClient.head(url, { observe: 'response' }).pipe(
            map((headRequest): { isImage?: boolean; contentLength?: string; url?: string } => {
              const contentType = headRequest.headers.get('Content-Type');
              const isImage = contentType?.startsWith('image');
              const contentLength = headRequest.headers.get('Content-Length') ?? undefined;
              return { isImage, contentLength, url };
            }),
            filter(({ isImage, contentLength, url: projectUrl }): boolean => {
              this.checkedHttpLinksSubject.next();
              return (
                !!projectUrl &&
                !!isImage &&
                !!contentLength &&
                parseInt(contentLength, 10) < MAX_IMAGE_SIZE
              );
            }),
            map((project) => project.url ?? '')
          )
        )
      ).pipe(take(1)),
      this.checkedHttpLinksSubject.pipe(
        take(candidateUrls.length),
        finalize(() => (this.showImagePlaceholder = false)),
        map(() => '')
      )
    );
  }

  afterImageLoaded(): void {
    this.showImagePlaceholder = false;
  }
}
