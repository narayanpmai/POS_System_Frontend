declare module '@remotemerge/nepali-date-converter' {
  export default class DateConverter {
    constructor(date: string | Date | number);
    toBs(): { year: number; month: number; date: number; day: string };
    toAd(): { year: number; month: number; date: number; day: string };
  }
}
