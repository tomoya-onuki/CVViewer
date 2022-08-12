import chroma, { random } from 'chroma-js';
import * as d3 from 'd3';
import $ = require('jquery');
import { Data } from './Data';
import { DataSet } from './DataSet';
declare var require: any;

export class Chart {
    private width: number;
    private height: number;
    private margin: { [key: string]: number } = {
        'top': 50, 'bottom': 50, 'right': 50, 'left': 100
    };
    private dataList: { [key: string]: Data } = {};
    private groupList: { [key: string]: DataSet } = {};
    private groupKeyList: string[] = []

    private potentialMin: number = 0
    private potentialMax: number = 0
    private currentMin: number = 0.6
    private currentMax: number = 1.2

    private xAxisMin: number = 0
    private xAxisMax: number = 0
    private yAxisMin: number = 0
    private yAxisMax: number = 0

    private titleLabel: string = 'Title';
    private labelX: string = 'Potential/V';
    private labelY: string = 'Current/A';
    private titleVis: boolean = true;
    private labelxVis: boolean = true;
    private labelyVis: boolean = true;
    private legendVis: boolean = true;
    private gridVis: boolean = false;
    private peakVis: boolean = true;

    private legendPos: { x: number, y: number } = { x: 10, y: 10 }

    private fontSize: number = 10
    private lineWeight: number = 1.5;


    constructor() {
        this.width = Number($('#svg-width').val())
        this.height = Number($('#svg-height').val())
    }

    public entry(data: Data): void {
        this.dataList[data.label] = data;
    }
    public removeData(label: string) {
        delete this.dataList[label]
    }

    public includesData(label: string): boolean {
        if (this.dataList[label]) {
            return true;
        }
        return false;
    }

    private expFromat(val: number) {
        let token0 = d3.format('e')(val)
        let token1: string[] = token0.split('.')
        let integer = token1[0]
        let token2 = token1[1].split('e')
        let exp = 'e' + token2[1]
        let decimal = token2[0].slice(0, 3)
        return integer + '.' + decimal + exp
    }

    public resize(w: number, h: number): void {
        this.width = w;
        this.height = h;
        this.draw();
    }

    public draw(): void {
        d3.select("svg").remove()
        if (this.groupKeyList.length > 0) {
            let chartW = this.width - this.margin.left - this.margin.right
            let chartH = this.height - this.margin.top - this.margin.bottom

            // SVG要素の作成
            const svg = d3.select("#view")
                .append("svg")
                .attr("id", "fig")
                .attr("width", this.width)
                .attr("height", this.height)
                .attr('background', '#FFF')


            // add X axis
            const xScale = d3.scaleLinear()
                .domain([this.xAxisMin, this.xAxisMax])
                .range([0, chartW]);
            svg.append("g")
                .attr('class', 'axis')
                .attr("transform", `translate(${this.margin.left}, ${chartH + this.margin.top})`)
                .attr("font-size", `${this.fontSize}px`)
                .call(d3.axisBottom(xScale));

            // Add Y axis
            const yScale = d3.scaleLinear()
                .domain([this.yAxisMin, this.yAxisMax])
                .range([chartH, 0]);
            svg.append("g")
                .attr('class', 'axis')
                .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                .attr("font-size", `${this.fontSize}px`)
                .call(d3.axisLeft(yScale).tickFormat(d3.format('e')));
            // 軸の文字サイズ
            svg.selectAll('.axis > .tick > text')
                .attr("font-size", `${this.fontSize}px`)

            // グリッド
            if (this.gridVis) {
                // 軸のticksを大きくしてグリッドにする
                svg.append("g")
                    .attr("transform", `translate(${this.margin.left}, ${chartH + this.margin.top})`)
                    .attr("font-size", `${this.fontSize}px`)
                    .attr('class', 'grid')
                    .call(d3.axisBottom(xScale).tickSize(-chartH));
                svg.append("g")
                    .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                    .attr("font-size", `${this.fontSize}px`)
                    .attr('class', 'grid')
                    .call(d3.axisLeft(yScale).tickFormat(d3.format('e')).tickSize(-chartW));
                // 罫線のスタイル
                d3.selectAll('.grid > .tick > line')
                    .attr("stroke-width", 0.5)
                    .attr("stroke", '#ddd')
                    .attr('transform', 'translate()')
                // 罫線以外削除
                d3.selectAll('.grid > .domain').remove()
                d3.selectAll('.grid > .tick > text').remove()
            }


            // 折線グラフの描画関数
            const line: any = d3.line()
                .x((d: any) => xScale(Number(d.potential)))
                .y((d: any) => yScale(Number(d.current)));


            // Supreposeで描画
            this.groupKeyList.forEach(key => {
                const data: DataSet = this.groupList[key]
                if (data.visible) {
                    // 描画
                    svg.append("path")
                        .datum(data.values)
                        .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                        .attr("fill", "none")
                        .attr("stroke", data.color)
                        .attr("stroke-width", this.lineWeight)
                        .attr("stroke-dasharray", data.dash)
                        .attr("d", line)
                }
            })

            // 凡例
            let leX = this.legendPos.x
            let leY = this.legendPos.y
            for (let i = this.groupKeyList.length - 1; i > -1; i--) {
                const key: string = this.groupKeyList[i]
                const data: DataSet = this.groupList[key]
                if (data.visible && this.legendVis) {
                    svg.append("line")
                        .attr("x1", leX)
                        .attr("x2", leX + 30)
                        .attr("y1", leY - 3)
                        .attr("y2", leY - 3)
                        .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                        .attr("stroke-dasharray", data.dash)
                        .attr("stroke-width", 2)
                        .attr("stroke", data.color);
                    svg.append('text')
                        .attr("x", leX + 35)
                        .attr("y", leY)
                        .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                        .attr("font-size", `${this.fontSize}px`)
                        .text(data.label)


                    if (this.peakVis) {
                        leY += 12
                        let maxCurrent: number = data.max().current
                        let minCurrent: number = data.min().current

                        let maxPotential: number = 0
                        let minPotential: number = 0
                        data.values.forEach(v => {
                            if (v.current === maxCurrent) {
                                maxPotential = v.potential
                            }
                            if (v.current === minCurrent) {
                                minPotential = v.potential
                            }
                        })

                        const maxX = xScale(maxPotential)
                        const maxY = yScale(maxCurrent)
                        const minX = xScale(minPotential)
                        const minY = yScale(minCurrent)
                        svg.append("circle")
                            .attr('cx', maxX)
                            .attr('cy', maxY)
                            .attr('r', 2)
                            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                            .attr("fill", data.color)
                        svg.append("circle")
                            .attr('cx', minX)
                            .attr('cy', minY)
                            .attr('r', 2)
                            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                            .attr("fill", data.color)

                        svg.append('text')
                            .attr('x', leX + 20)
                            .attr('y', leY)
                            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                            .attr("font-size", `${this.fontSize}px`)
                            .text(`max(${maxPotential}, ${this.expFromat(maxCurrent)}), min(${minPotential}, ${this.expFromat(minCurrent)})`)
                    }
                    leY += 20
                }
            }

            // ピーク値
            // if (this.peakVis) {
            //     let maxPosList: number[][] = []
            //     let maxLabelPosList: number[][] = []
            //     let minPosList: number[][] = []
            //     let minLabelPosList: number[][] = []
            //     this.groupKeyList.forEach(key => {
            //         const data: DataSet = this.groupList[key]
            //         let maxCurrent: number = data.max().current
            //         let minCurrent: number = data.min().current

            //         let maxPotential: number = 0
            //         let minPotential: number = 0
            //         data.values.forEach(v => {
            //             if (v.current === maxCurrent) {
            //                 maxPotential = v.potential
            //             }
            //             if (v.current === minCurrent) {
            //                 minPotential = v.potential
            //             }
            //         })

            //         const maxX = xScale(maxPotential)
            //         const maxY = yScale(maxCurrent)
            //         maxPosList.push([maxX, maxY])
            //         maxLabelPosList.push([
            //             maxX + (Math.random() * 40 - 20),
            //             maxY - (Math.random() * 20 + 10)
            //         ])

            //         const minX = xScale(minPotential)
            //         const minY = yScale(minCurrent)
            //         minPosList.push([minX, minY])
            //         minLabelPosList.push([
            //             minX + (Math.random() * 40 - 20),
            //             minY - (Math.random() * 20 + 10)
            //         ])
            //     })
            //     // let offsetY = Math.max(...minLabelPosList)
            //     // let offsetY = Math.max(...minLabelPosList)
            //     maxLabelPosList = this.layoutLabel(maxLabelPosList, maxPosList)
            //     minLabelPosList = this.layoutLabel(minLabelPosList, minPosList)

            //     this.groupKeyList.forEach((key, idx) => {
            //         const data: DataSet = this.groupList[key]
            //         if (data.visible) {
            //             let maxPos: number[] = maxPosList[idx]
            //             let minPos: number[] = minPosList[idx]
            //             let maxLabelPos: number[] = maxLabelPosList[idx]
            //             let minLabelPos: number[] = minLabelPosList[idx]

            //             let maxCurrent: number = data.max().current
            //             let minCurrent: number = data.min().current

            //             let maxPotential: number = 0
            //             let minPotential: number = 0
            //             data.values.forEach(v => {
            //                 if (v.current === maxCurrent) {
            //                     maxPotential = v.potential
            //                 }
            //                 if (v.current === minCurrent) {
            //                     minPotential = v.potential
            //                 }
            //             })

            //             let anchor = maxPos[0] < maxLabelPos[0] ? 'start' : 'end'
            //             svg.append('text')
            //                 .attr('x', maxLabelPos[0])
            //                 .attr('y', maxLabelPos[1])
            //                 .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
            //                 .attr("font-size", `${this.fontSize}px`)
            //                 .attr('text-anchor', anchor)
            //                 .text(`(${maxPotential}, ${this.expFromat(maxCurrent)})`)
            //             svg.append('line')
            //                 .attr("x1", maxLabelPos[0])
            //                 .attr("x2", maxPos[0])
            //                 .attr("y1", maxLabelPos[1])
            //                 .attr("y2", maxPos[1])
            //                 .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
            //                 .attr("stroke-width", 1)
            //                 .attr("stroke", '#444');

            //             anchor = minPos[0] < minLabelPos[0] ? 'start' : 'end'
            //             svg.append('text')
            //                 .attr('x', minLabelPos[0])
            //                 .attr('y', minLabelPos[1])
            //                 .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
            //                 .attr("font-size", `${this.fontSize}px`)
            //                 .text(`(${minPotential}, ${this.expFromat(minCurrent)})`)
            //             svg.append('line')
            //                 .attr("x1", minLabelPos[0])
            //                 .attr("x2", minPos[0])
            //                 .attr("y1", minLabelPos[1])
            //                 .attr("y2", minPos[1])
            //                 .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
            //                 .attr("stroke-width", 1)
            //                 .attr("stroke", '#444');
            //         }
            //     })
            // }




            // X軸ラベルの描画
            if (this.labelxVis) {
                svg.append('text')
                    .attr("id", "svg-x-axis")
                    .attr("x", this.width / 2)
                    .attr("y", this.height - 5)
                    .attr("text-anchor", "bottom")
                    .attr("font-size", `${this.fontSize}px`)
                    .attr("font-family", "Arial")
                    .text(this.labelX);
            }


            // Y軸ラベルの描画
            if (this.labelyVis) {
                svg.append('text')
                    .attr("id", "svg-y-axis")
                    .attr("x", -this.height / 2)
                    .attr("y", 10)
                    .attr("text-anchor", "top")
                    .attr("font-size", `${this.fontSize}px`)
                    .attr("font-family", "Arial")
                    .attr("transform", "rotate(-90)")
                    .text(this.labelY);
            }

            // タイトルラベル
            if (this.titleVis) {
                svg.append("text")
                    .attr("id", "svg-title")
                    .attr("x", this.width / 2)
                    .attr("y", 10)
                    .attr("font-size", `${this.fontSize}px`)
                    .attr("text-anchor", "top")
                    .attr("font-family", "Arial")
                    .text(this.titleLabel);
            }
        }
    }

    private layoutLabel(labelPosList: number[][], rootPosList: number[][]): number[][] {
        const k = 20 // ばね定数
        const c = 10 // 定数
        const equilibriumLen = 10 // ばねの自然長
        let speed: number = 0 // ノードの速度
        let mass: number = 1 // ノードの質量
        const dt: number = 0.1 // 微小時間
        const easeing: number = 1 // 減衰定数
        let kineticEnergy: number = 0 // 運動エネルギーの合計
        const keThreshold: number = 10000 * labelPosList.length // 運動エネルギーの閾値
        const labelW = 30
        const labelH = 10

        const dist = (p0: number[], p1: number[]) => {
            return Math.sqrt(Math.pow(p1[0] - p0[0], 2) + Math.pow(p1[1] - p0[1], 2))
        }

        if (labelPosList.length === 1) {
            return labelPosList
        } else {
            let counter = 0
            do {
                for (let i = 0; i < labelPosList.length; i++) {
                    let power: number = 0

                    // クーロン力
                    labelPosList.forEach(lp => {
                        let d = dist(labelPosList[i], lp)
                        if (d != 0) power += c / Math.pow(d, 2)
                    })
                    rootPosList.forEach(p => {
                        let d = dist(labelPosList[i], p)
                        if (d != 0) power += c / Math.pow(d, 2)
                    })

                    // フックの法則
                    power += k * (dist(labelPosList[i], rootPosList[i]) - equilibriumLen)

                    // 更新
                    speed = (speed + dt * power / mass) * easeing
                    labelPosList[i][0] += dt * speed
                    // labelPosList[i][0] = rootPosList[i][0] + 10
                    labelPosList[i][1] += dt * speed
                    kineticEnergy += mass * speed * speed
                }
                counter++
                console.log(kineticEnergy)
                // if (counter > 1000) break
                // } while (counter < 1000)
            } while (kineticEnergy < keThreshold)

            // ラベルの位置をrootの右上になるように操作
            for (let i = 0; i < labelPosList.length; i++) {
                // let diffX = Math.abs(rootPosList[i][0] - labelPosList[i][0])
                // labelPosList[i][0] = rootPosList[i][0] + diffX
                // let diffY = Math.abs(rootPosList[i][1] - labelPosList[i][1])
                // labelPosList[i][1] = rootPosList[i][1] - diffY
            }
            return labelPosList
        }
    }

    public setTitleLabel(label: string): void {
        this.titleLabel = label;
        this.draw();
    }

    public setAxisLabelX(label: string): void {
        this.labelX = label;
        this.draw();
    }

    public setAxisLabelY(label: string): void {
        this.labelY = label;
        this.draw();
    }


    private setUI() {
        $('#set-graph-title').val(this.titleLabel)
        $('#set-graph-label-x').val(this.labelX)
        $('#set-graph-label-y').val(this.labelY)
        $('#x-axis-min').val(this.potentialMin)
        $('#x-axis-max').val(this.potentialMax)
        $('#y-axis-min').val(this.expFromat(this.currentMin))
        $('#y-axis-max').val(this.expFromat(this.currentMax))
        // $('#x-axis-min').attr('max', this.potentialMax)
        // $('#x-axis-min').attr('min', this.potentialMin)
    }

    public setXaxisMin(val: number) {
        this.xAxisMin = val
        this.draw()
    }
    public setXaxisMax(val: number) {
        this.xAxisMax = val
        this.draw()
    }
    public setYaxisMin(val: number) {
        this.yAxisMin = val
        this.draw()
    }
    public setYaxisMax(val: number) {
        this.yAxisMax = val
        this.draw()
    }
    public changeTitleVis(flag: boolean) {
        this.titleVis = flag
        this.draw()
    }
    public changeLabelxVis(flag: boolean) {
        this.labelxVis = flag
        this.draw()
    }
    public changeLabelyVis(flag: boolean) {
        this.labelyVis = flag
        this.draw()
    }
    public changeLegendVis(flag: boolean) {
        this.legendVis = flag
        this.draw()
    }
    public changePeakVis(flag: boolean) {
        this.peakVis = flag
        this.draw()
    }
    public changeGridVis(flag: boolean) {
        this.gridVis = flag
        this.draw()
    }

    public hasGroupLabel(label: string): boolean {
        return this.groupKeyList.includes(label)
    }
    public groupingData(labelList: string[], groupLabel: string) {
        // console.log(labelList)
        let groupDataList: Data[] = labelList.map(label => this.dataList[label])

        if (groupDataList.length > 0) {
            this.groupList[groupLabel] = new DataSet(groupLabel, groupDataList)

            // 最小-最大の設定
            let potentialMinList: number[] = []
            let potentialMaxList: number[] = []
            let currentMinList: number[] = []
            let currentMaxList: number[] = []
            for (let key in this.groupList) {
                const data: Data = this.groupList[key]
                let min = data.min()
                let max = data.max()
                currentMinList.push(min.current)
                currentMaxList.push(max.current)
                potentialMinList.push(min.potential)
                potentialMaxList.push(max.potential)
            }
            this.potentialMin = Math.min(...potentialMinList)
            this.potentialMax = Math.max(...potentialMaxList)
            this.currentMin = Math.min(...currentMinList)
            this.currentMax = Math.max(...currentMaxList)

            // 軸の最大最小
            this.xAxisMin = this.potentialMin
            this.xAxisMax = this.potentialMax
            this.yAxisMin = this.currentMin
            this.yAxisMax = this.currentMax

            this.sortGroupKeyList(Object.keys(this.groupList))
            this.draw()
            this.setUI()
        }
        // console.log(groupDataList)
        // console.log(this.groupList)

    }

    public sortGroupKeyList(list: string[]) {
        this.groupKeyList = list.reverse()
        this.draw()
    }


    public dump(): void {
        for (let key in this.dataList) {
            this.dataList[key].dump();
        }
    }


    public changeDataVisibleAll(flag: boolean) {
        for (let key in this.groupList) {
            this.groupList[key].visible = flag
        }
        this.draw()
    }
    public changeDataVisible(label: string, flag: boolean) {
        this.groupList[label].visible = flag
        this.draw()
    }
    public changeDataColor(label: string, color: string) {
        this.groupList[label].color = color
        this.draw()
    }
    public removeGroup(label: string) {
        delete this.groupList[label]
        this.sortGroupKeyList(Object.keys(this.groupList))
        this.draw()
    }
    public changeGroupLabel(key: string, newLabel: string) {
        this.groupList[key].label = newLabel
        this.sortGroupKeyList(Object.keys(this.groupList))
        this.draw()
    }


    public chageFontSize(ratio: number) {
        this.fontSize = 10 * ratio
        this.draw()
    }
    public changeLineWeight(w: number) {
        this.lineWeight = w
        this.draw()
    }
    public changeLineType(type: string) {
        if (type === 'hue') {
            let hue = 0;
            this.groupKeyList.forEach(key => {
                let color = chroma.hsv(hue, 0.5, 0.9)
                this.groupList[key].color = color.css()
                $('#' + key + '-color').val(color.name())
                this.groupList[key].dash = '1,0'
                hue += 360 / this.groupKeyList.length
            })
        }
        else if (type === 'sat_blue') {
            let sat = 0.2;
            this.groupKeyList.forEach(key => {
                let color = chroma.hsv(210, sat, 1.0)
                this.groupList[key].color = color.css()
                $('#' + key + '-color').val(color.name())
                this.groupList[key].dash = '1,0'
                sat += 0.8 / this.groupKeyList.length
            })
        }
        else if (type === 'sat_orange') {
            let sat = 0.2;
            this.groupKeyList.forEach(key => {
                let color = chroma.hsv(20, sat, 1.0)
                this.groupList[key].color = color.css()
                $('#' + key + '-color').val(color.name())
                this.groupList[key].dash = '1,0'
                sat += 0.8 / this.groupKeyList.length
            })
        }
        else if (type === 'bri') {
            let bri = 0.2;
            this.groupKeyList.forEach(key => {
                let color = chroma.hsv(210, 0, bri)
                this.groupList[key].color = color.css()
                $('#' + key + '-color').val(color.name())
                this.groupList[key].dash = '1,0'
                bri += 0.8 / this.groupKeyList.length
            })
        }
        else if (type === 'dash') {
            let segment = 1;
            this.groupKeyList.forEach(key => {
                this.groupList[key].dash = `${segment}, ${segment}`
                this.groupList[key].color = '#000'
                $('#' + key + '-color').val('#000')
                segment += 2
            })
        }
        else if (type === 'mono') {
            this.groupKeyList.forEach(key => {
                this.groupList[key].dash = '1,0'
                this.groupList[key].color = '#000'
                $('#' + key + '-color').val('#000')
            })
        }

        this.draw()
    }


    public getData(label: string): Data {
        return this.dataList[label]
    }
    public getGroup(label: string): DataSet {
        return this.groupList[label]
    }
    public removeDataFromGroup(groupLabel: string, dataLabel: string) {
        this.groupList[groupLabel].removeData(dataLabel)
        // console.log(this.groupList)
        this.sortGroupKeyList(Object.keys(this.groupList))
        this.draw()
    }


    public legendMoveByMouse(mouseX: number, mouseY: number) {
        this.legendPos.x = mouseX - this.margin.left
        this.legendPos.y = mouseY - this.margin.top
        this.draw()
    }
}