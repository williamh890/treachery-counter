// features/decks/scryfall.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, concatMap, delay, map, Observable, of, range, toArray } from 'rxjs';
import { Commander } from '../models//deck';

interface ScryfallImages {
  art_crop?: string;
  border_crop?: string;
}
interface ScryfallCard {
  name: string;
  image_uris?: ScryfallImages;
  card_faces?: { image_uris?: ScryfallImages }[];
}
interface ScryfallList {
  data: ScryfallCard[];
}

@Injectable({ providedIn: 'root' })
export class ScryfallService {
  private http = inject(HttpClient);

  searchCommanders(query: string): Observable<Commander[]> {
    const q = query.trim().replace(/"/g, '');
    if (q.length < 2) return of([]);

    const params = new HttpParams().set('q', `name:"${q}" is:commander`).set('unique', 'cards');

    return this.http.get<ScryfallList>('https://api.scryfall.com/cards/search', { params }).pipe(
      map((res) => res.data.slice(0, 10).map(toCommander)),
      catchError(() => of([])), // Scryfall returns 404 when nothing matches
    );
  }

  randomCommander(): Observable<Commander | null> {
    const params = new HttpParams().set('q', 'is:commander');

    return this.http.get<ScryfallCard>('https://api.scryfall.com/cards/random', { params }).pipe(
      map(toCommander),
      catchError(() => of(null)),
    );
  }

  randomCommanders(n: number): Observable<Commander[] | null> {
    console.log(n);
    return range(0, n).pipe(
      concatMap(() => this.randomCommander().pipe(delay(100))),
      toArray(),
      map((list) => list.filter((c): c is Commander => c !== null)),
      catchError((err) => {
        console.error('Scryfall random failed', err);
        return of(null);
      }),
    );
  }
}

function toCommander(card: ScryfallCard): Commander {
  // Double-faced cards keep their images on the faces
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris;
  return { name: card.name, url: images?.art_crop ?? '' };
}
