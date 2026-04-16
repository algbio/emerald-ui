declare module 'canvas2svg' {
  export default class C2S {
    constructor(width: number, height: number);
    getSerializedSvg(fixNamedEntities?: boolean): string;
    getSvg(): SVGElement;
  }
}
