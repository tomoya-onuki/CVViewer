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
    private outputName: string = 'figure.png'

    constructor() {
        this.chart.init();
    }

    public init(): void {
        const me: Main = this;
        const fReader: ReadFiles = new ReadFiles();

        // drawTest();
        // console.log($('#file-list').length)
        // console.log($('#file-list').is(':empty'))

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
            const type: string = String($('#fig-type > option:selected').val())
            me.saveFig(type);
        });

        $('#fig-type').on('change', function () {
            let extension: string = String($(this).find('option:selected').val())
            $('#save-fig-ext').text(`.${extension}`)
            let fname: string = String($('#save-fig-name').val()) + '.' + extension
            me.outputName = fname;
        })
        $('#save-fig-name').on('change', function () {
            let extension: string = String($('#fig-type > option:selected').val())
            let fname: string = String($(this).val()) + '.' + extension
            me.outputName = fname;
        });

        $('#set-graph-label-x').on('input', function () {
            me.chart.setAxisLabelX(String($(this).val()));
        });
        $('#set-graph-label-y').on('input', function () {
            me.chart.setAxisLabelY(String($(this).val()));
        });
        $('#set-graph-title').on('input', function () {
            me.chart.setTitleLabel(String($(this).val()));
        });

        // イベントリスナの登録
        $('#file-selector').on('change', function () {
            let label: string = String($(this).find('option:selected').val());
            console.log(label)
            me.chart.setVisLabel(label);
            me.chart.draw();
            // me.chart.dump()
        });
    }

    private setData(dataList: Data[]): void {
        const me: Main = this;
        dataList.forEach((data: Data) => {
            // そのデータラベルを持っているかのチェック
            // 持っていないとき = 新規
            if (!this.chart.includesData(data.label)) {

                // データの追加
                this.chart.addData(data);

                // セレクタ版
                // UIに追加
                $('#file-selector > #def').remove()
                $('<option></option>')
                    .val(data.label)
                    .text(data.label.replace('-', '.'))
                    .prop('selected', true)
                    .appendTo($('#file-selector'))
                me.chart.setVisLabel(data.label);
                me.chart.draw();
                // me.chart.dump();
            }
            // データラベルが既に存在するとき、
            else {
                alert(`${data.label}.csv は既に読み込んだファイルと、ファイル名が重複しています。ファイル名を変更して再度読み込んでください。`)
            }
        });

    }


    private saveFig(type: string): void {
        if ($('#fig').length === 0) {
            alert('グラフがありません')
            return;
        }
        switch (type) {
            case 'png':
                this.saveFigbyPNG();
                break;
            case 'svg':
                this.saveFigbySVG()
                break;
            default:
                alert('保存に失敗しました')
                break;
        }
    }

    private saveFigbySVG(): void {
        // console.log($('#view').html())
        let content: string = String($('#view').html())
        content += `<csv>${this.chart.getCSVstr()}</csv>`
        
        const url: any = URL.createObjectURL(new Blob([content], { type: 'text/svg' }))
        let outname = (this.outputName.indexOf('.svg') != -1) ? this.outputName : this.outputName + '.svg'

        $('<a>', {
            href: url,
            download: outname
        })[0].click()
    }

    private saveFigbyPNG(): void {

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
                let outname = (this.outputName.indexOf('.png') != -1) ? this.outputName : this.outputName + '.png'
                $('<a>', {
                    href: url,
                    download: outname
                })[0].click()
                
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


