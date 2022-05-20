import * as d3 from 'd3';
import { Data } from './Data';
export class Chart {
    private width: number = 600;
    private height: number = 600;
    private margin: { [key: string]: number } = {
        'top': 50, 'bottom': 50, 'right': 10, 'left': 10
    };
    // private titleLabel: string = 'グラフタイトル';
    // private labelX: string = '横軸のラベル';
    // private labelY: string = '縦軸のラベル';

    private dataList: { [key: string]: Data } = {};

    private visLabel: string = '';

    constructor() {

    }

    public init(): void {

    }

    public addData(data: Data): void {
        this.dataList[data.getLabel()] = data;
    }

    public includesData(label: string): boolean {
        if (this.dataList[label]) {
            return true;
        }
        return false;
    }


    public resize(w: number, h: number): void {
        this.width = w;
        this.height = h;
        this.draw();
    }

    private draw(): void {
        if (this.includesData(this.visLabel)) {
            const data: Data = this.dataList[this.visLabel];
            const titleLabel = data.getTitleLabel();
            const labelX = data.getAxisLabelX();
            const labelY = data.getAxisLabelY();

            $('#set-graph-title').val(titleLabel);
            $('#set-graph-label-x').val(labelX);
            $('#set-graph-label-y').val(labelY);
            
            d3.select("svg").remove();

            const svg = d3.select("#view")
                .append("svg")
                .attr("id", "fig")
                .attr("width", this.width)
                .attr("height", this.height);

            // X軸ラベルの描画
            svg.append('text')
                .attr("x", this.width / 2)
                .attr("y", this.height - 5)
                .attr("text-anchor", "bottom")
                .attr("font-size", "10px")
                .attr("font-family", "Arial")
                .text(labelX);

            // Y軸ラベルの描画
            svg.append('text')
                .attr("y", 10)
                .attr("x", -this.height / 2)
                .attr("text-anchor", "top")
                .attr("font-size", "10px")
                .attr("font-family", "Arial")
                .attr("transform", "rotate(-90)")
                .text(labelY);

            // タイトルラベル
            svg.append("text")
                .attr("x", this.width / 2)
                .attr("y", this.margin.top - 10)
                .attr("font-size", "10px")
                .attr("text-anchor", "top")
                .attr("font-family", "Arial")
                .text(titleLabel);
        }
    }

    public setTitleLabel(label: string): void {
        if (this.includesData(this.visLabel)) {
            this.dataList[this.visLabel].setTitleLabel(label);
            this.draw();
        }
    }

    public setAxisLabelX(label: string): void {
        if (this.includesData(this.visLabel)) {
            this.dataList[this.visLabel].setAxisLabelX(label);
            this.draw();
        }
    }

    public setAxisLabelY(label: string): void {
        if (this.includesData(this.visLabel)) {
            this.dataList[this.visLabel].setAxisLabelY(label);
            this.draw();
        }
    }

    public setVisLabel(label: string): void {
        this.visLabel = label;
        this.draw();
    }

    public dump(): void {
        for (let key in this.dataList) {
            this.dataList[key].dump();
        }
    }
}