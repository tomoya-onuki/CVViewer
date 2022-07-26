import * as d3 from 'd3';
import { DSVRowArray, DSVRowString } from 'd3';

export class Data {
    private csvData: string[][] = [];
    private _label: string;
    private _titleLabel: string = 'Title';
    private _labelX: string = 'Label X';
    private _labelY: string = 'Label Y';

    constructor(csv: string[][], label: string) {
        this.csvData = csv;
        this._label = label;
    }

    private init(): void {

    }

    public getCSVstr(): string {
        let ret: string = '';
        this.csvData.forEach((row) => {
            row.forEach(col => ret += (col + ','))
            ret += '\n'
        })
        return ret;
    }
    public get label(): string {
        return this._label
    }

    public get titleLabel(): string {
        return this._titleLabel;
    }

    public get labelX(): string {
        return this._labelX;
    }

    public get labelY(): string {
        return this._labelY;
    }

    public set titleLabel(label: string) {
        this._titleLabel = label;
    }

    public set labelX(label: string) {
        this._labelX = label;
    }

    public set labelY(label: string) {
        this._labelY = label;
    }

    public dump(): void {
        console.log(this.label, this._labelX, this._labelY);
        this.csvData.forEach((row) => {
            // console.log(row);
        });
    }
}