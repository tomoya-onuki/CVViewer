import * as d3 from 'd3';
import { DSVRowArray, DSVRowString } from 'd3';

export class Data {
    private csvData: string[][] = [];
    private label: string;

    constructor(csv: string[][], label: string) {
        this.csvData = csv;
        this.label = label;
    }

    private init(): void {

    }

    public getLabel(): string {
        return this.label;
    }

    public dump(): void {
        console.log(this.label);
        this.csvData.forEach((row) => {
            console.log(row);
        });
    }
}