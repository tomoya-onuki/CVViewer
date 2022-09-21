// import * as d3 from 'd3';
// import { DSVRowArray, DSVRowString } from 'd3';

export class Data {
    private _label: string;
    private _values: { potential: number, current: number }[] = []

    constructor(label: string) {
        this._label = label;
    }

    private init(): void {

    }

    public entry(p: string, c: string): void {
        this._values.push({
            // potential: p,
            potential: this.formatExp2Normal(p),
            current: this.formatExp2Normal(c)
        })
        // console.log(p,c)
    }
    public get values(): { potential: number, current: number }[] {
        return this._values
    }
    public set values(v: { potential: number, current: number }[]) {
        this._values = v
    }

    public get label(): string {
        return this._label
    }
    public set label(l: string) {
        this._label = l
    }

    private formatExp2Normal(v: string): number {
        if (v.indexOf('e') != -1) {
            let token = v.split('e')
            let exp = Number(token[1])
            let num: number = Number(token[0]) * Math.pow(10, exp)
            return num
        } else if (v.indexOf('E') != -1) {
            let token = v.split('E')
            let exp = Number(token[1])
            let num: number = Number(token[0]) * Math.pow(10, exp)
            return num
        }
        return parseFloat(v)
    }


    public min(): { potential: number, current: number } {
        let plist: number[] = this.values.map(v => v.potential)
        let clist: number[] = this.values.map(v => v.current)
        let pmin = Math.min(...plist)
        let cmin = Math.min(...clist)

        return { potential: pmin, current: cmin }
    }
    public max(): { potential: number, current: number } {
        let plist: number[] = this.values.map(v => v.potential)
        let clist: number[] = this.values.map(v => v.current)
        let pmax = Math.max(...plist)
        let cmax = Math.max(...clist)

        return { potential: pmax, current: cmax }
    }

    public dump(): void {

    }
}