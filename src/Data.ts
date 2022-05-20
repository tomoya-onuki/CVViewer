import * as d3 from 'd3';
import { DSVRowArray, DSVRowString } from 'd3';

export class Data {
    private csvData: string[][] = [];
    private label: string;
    private titleLabel: string = 'グラフタイトル';
    private labelX: string = '横軸のラベル';
    private labelY: string = '縦軸のラベル';

    constructor(csv: string[][], label: string) {
        this.csvData = csv;
        this.label = label;
    }

    private init(): void {

    }

    public getLabel(): string {
        return this.label;
    }



    public getTitleLabel(): string {
        return this.titleLabel;
    }

    public getAxisLabelX(): string {
        return this.labelX;
    }

    public getAxisLabelY(): string {
        return this.labelY;
    }

    public setTitleLabel(label: string): void {
        this.titleLabel = label;
    }

    public setAxisLabelX(label: string): void {
        this.labelX = label;
    }

    public setAxisLabelY(label: string): void {
        this.labelY = label;
    }

    public dump(): void {
        console.log(this.label);
        this.csvData.forEach((row) => {
            console.log(row);
        });
    }
}