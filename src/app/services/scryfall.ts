// features/decks/scryfall.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Commander } from '../models//deck';

interface ScryfallImages { art_crop?: string; border_crop?: string }
interface ScryfallCard {
  name: string;
  image_uris?: ScryfallImages;
  card_faces?: { image_uris?: ScryfallImages }[];
}
interface ScryfallList { data: ScryfallCard[] }

@Injectable({ providedIn: 'root' })
export class ScryfallService {
  private http = inject(HttpClient);

  searchCommanders(query: string): Observable<Commander[]> {
    const q = query.trim().replace(/"/g, '');
    if (q.length < 2) return of([]);

    const params = new HttpParams()
      .set('q', `name:"${q}" is:commander`)
      .set('unique', 'cards');

    return this.http
      .get<ScryfallList>('https://api.scryfall.com/cards/search', { params })
      .pipe(
        map((res) => res.data.slice(0, 10).map(toCommander)),
        catchError(() => of([])), // Scryfall returns 404 when nothing matches
      );
  }
}

function toCommander(card: ScryfallCard): Commander {
  // Double-faced cards keep their images on the faces
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris;
  return { name: card.name, url: images?.art_crop ?? '' };
}
