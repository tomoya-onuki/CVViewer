import * as d3 from 'd3';
import { DSVRowArray, DSVRowString } from 'd3';
import $ = require('jquery');
import { Chart } from './Chart';
import { Data } from './Data';
import { ReadFiles } from './ReadFiles';
declare var require: any;

$(function () {
    new Main().init();
});

export class Main {
    private chart: Chart = new Chart();

    constructor() {
        this.chart.init();
    }

    public init(): void {
        const me: Main = this;
        const fReader: ReadFiles = new ReadFiles();

        // drawTest();

        // イベントリスナ
        // ファイルを選択
        $('#file-input')
            .on('change', function (e: any) {
                const files = e.target.files; // ファイルのリスト
                fReader.readFiles(files)
                    .then((dataList: Data[]) => me.setData(dataList));
            });
        // ファイルをドロップ
        $('#file-drop')
            .on('dragover', function (e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).css({
                    'color': '#239efc',
                    'border-color': '#239efc'
                });
            })
            .on('drop', function (e: any) {
                e.preventDefault();
                e.stopPropagation();
                const files = e.originalEvent.dataTransfer.files;
                $(this).css({
                    'color': '#222',
                    'border-color': '#888'
                });
                fReader.readFiles(files)
                    .then((dataList: Data[]) => me.setData(dataList));
            })
            // マウスホバー
            .on('mouseover', function () {
                $(this).css({
                    'color': '#239efc',
                    'border-color': '#239efc'
                });
            })
            .on('mouseleave', function () {
                $(this).css({
                    'color': '#222',
                    'border-color': '#888'
                });
            });

        $('#save-fig').on('click', function () {
            me.saveFig();
        });

        $('#set-graph-label-x').on('input', function() {
            me.chart.setAxisLabelX(String($(this).val()));
        });
        $('#set-graph-label-y').on('input', function() {
            me.chart.setAxisLabelY(String($(this).val()));
        });
        $('#set-graph-title').on('input', function() {
            me.chart.setTitleLabel(String($(this).val()));
        });
    }

    private setData(dataList: Data[]): void {
        const me: Main = this;
        dataList.forEach((data: Data) => {
            // そのデータラベルを持っているかのチェック
            // 持っていないとき = 新規
            if (!this.chart.includesData(data.getLabel())) {

                // データの追加
                this.chart.addData(data);

                // "ファイルがありません" が消えて
                // "ファイルを選択するとグラフが表示されます" が表示される
                $('#file-list').prev().show(); 
                $('#file-list').prev().prev().hide(); 

                // UIに追加
                $('<div></div>')
                    .attr('class', 'item')
                    .append(
                        $('<input>')
                            .attr('type', 'radio')
                            .attr('id', data.getLabel())
                            .attr('class', 'file-radio-btn')
                            .attr('value', data.getLabel())
                            .attr('name', 'files')
                    )
                    .append(
                        $('<label></label>')
                            .attr('for', data.getLabel())
                            .text(data.getLabel() + '.csv')
                    )
                    .appendTo($('#file-list'));


                // イベントリスナの登録
                $('#' + data.getLabel()).on('click', function () {
                    let label: string = String($(this).val());
                    me.chart.setVisLabel(label);
                });
            }
            // データラベルが既に存在するとき、
            else {
                alert(`${data.getLabel()}.csv は既に読み込んだファイルと、ファイル名が重複しています。ファイル名を変更して再度読み込んでください。`)
            }
        });

    }


    private saveFig(): void {

        const input: any = document.querySelector('#fig');
        const svgData = new XMLSerializer().serializeToString(input);
        const svgDataBase64 = btoa(unescape(encodeURIComponent(svgData)))
        const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${svgDataBase64}`;

        const image = new Image();

        image.addEventListener('load', () => {
            const canvas = document.createElement('canvas');
            const width: number = input.getAttribute('width') * devicePixelRatio;
            const height: number = input.getAttribute('height') * devicePixelRatio;

            canvas.setAttribute('width', String(width));
            canvas.setAttribute('height', String(height));

            const context = <CanvasRenderingContext2D>canvas.getContext('2d')
            context.drawImage(image, 0, 0, width, height);

            canvas.toBlob((blob: any) => {
                const url: any = URL.createObjectURL(blob);
                const a = document.createElement("a");
                document.body.appendChild(a);
                a.download = 'fig.png';
                a.href = url;
                a.click();
                a.remove();
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1E4);
            }, 'image/png');
        });
        image.src = svgDataUrl;
    }
}





function drawTest(): void {
    let width: number = 400;
    let height: number = 300;

    // SVGの設定
    const svg: any = d3.select("#view")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "fig");

    // データの読み込み
    d3.csv("../temp.csv")
        .then((data) => {
            draw(svg, data);
        })
        .catch((error) => {
            console.log(error)
        });
}
function draw(svg: any, data: DSVRowArray): void {
    let width: number = 400;
    let height: number = 300;
    let marginTop: number = 50;
    let marginRight: number = 10;
    let marginBottom: number = 50;
    let marginLeft: number = 70;

    let chartWidth: number = width - marginLeft - marginRight;
    let chartHeight: number = height - marginTop - marginBottom;

    // console.log(data);

    // x axis
    let xScale: any = d3.scaleLinear()
        .domain([1, 12])
        .range([0, chartWidth]);
    let xLabel: any = svg.append("g")
        .attr("transform", "translate(" + marginLeft + "," + Number(marginTop + chartHeight) + ")")
        .call(d3.axisBottom(xScale));

    xLabel.selectAll("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-family", "Arial")

    svg.append("text")
        .attr("y", height - 10)
        .attr("x", chartWidth / 2 + marginLeft)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-family", "Arial")
        .text("月")

    // y axis
    let yScale: any = d3.scaleLinear()
        .domain([0, 30])
        .range([chartHeight, 0]);
    let yLabel: any = svg.append("g")
        .attr("transform", "translate(" + marginLeft + "," + marginTop + ")")
        .call(d3.axisLeft(yScale));

    yLabel.selectAll("text")
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("font-family", "Arial")

    svg.append("text")
        .attr("y", height / 2)
        .attr("x", 40)
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("font-family", "Arial")
        .text("気温(℃)")


    const line: any = d3.line()
        .x((d: any) => xScale(d.month))
        .y((d: any) => yScale(d.temp));

    svg.append("path")
        .datum(data)
        .attr("transform", "translate(" + marginLeft + "," + marginTop + ")")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);

    svg.append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop - 10)
        .attr("font-size", "10px")
        .attr("text-anchor", "top")
        .attr("font-family", "Arial")
        .text("月平均気温の推移(東京都)");
}


