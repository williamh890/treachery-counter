export interface Commander {
  name: string;
  url: string;
}

export interface Deck {
  id: string;
  name: string;
  commander: Commander;
  partner?: Commander;
}

export type NewDeck = Omit<Deck, 'id'>;
