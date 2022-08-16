import chroma from 'chroma-js';
import * as d3 from 'd3';
import $ = require('jquery');
import { Data } from './Data';
import { DataSet } from './DataSet';
declare var require: any;

export class Chart {
    private width: number;
    private height: number;
    private margin: { [key: string]: number } = {
        'top': 30, 'bottom': 50, 'right': 20, 'left': 50
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
    private labelX: string = 'Potential / V';
    private labelY: string = 'Current / μA';
    private titleVis: boolean = true;
    private labelxVis: boolean = true;
    private labelyVis: boolean = true;
    private legendVis: boolean = true;
    private gridVis: boolean = false;
    // private peakVis: boolean = true;
    private frameVis: boolean = true;
    private maxVis: boolean = false;
    private minVis: boolean = false;

    private sigDigX: number = 3;
    private sigDigY: number = 3;
    private expX: number = 0;
    private expY: number = -6;

    private legendPos: { x: number, y: number } = { x: 10, y: 10 }

    private fontSize: number = 10
    private lineWeight: number = 1.5;
    private lineIsDash: boolean = false
    private lineType: string = 'mono'

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

    // private expFromat(val: number) {
    //     let token0 = d3.format('e')(val)
    //     let token1: string[] = token0.split('.')
    //     let integer = token1[0]
    //     let token2 = token1[1].split('e')
    //     let exp = 'e' + token2[1]
    //     let decimal = token2[0].slice(0, 3)
    //     return integer + '.' + decimal + exp
    // }

    private expFormat(val: number, exponent: number, sigDig: number): string {
        // 計算誤差を抑える
        if (val > 0) {
            if (exponent > 0) {
                val /= Math.pow(10, exponent)
            } else if (exponent < 0) {
                val *= Math.pow(10, Math.abs(exponent))
            } else {
                val = val
            }
        } else {
            val /= Math.pow(10, exponent)
        }

        let txt: string = val.toString()

        // toString()で指数表示になったばあい
        if (txt.indexOf('e-') != -1) {
            let token1: string[] = txt.split('e-')
            let exp: number = parseFloat(token1[1])
            txt = ''
            for (let i = 0; i < exp; i++) {
                if (i === 1) txt += '.'
                txt += '0'
            }
            txt += token1[0]
        }
        if (txt.indexOf('e+') != -1) {
            let token1: string[] = txt.split('e+')
            let exp: number = parseFloat(token1[1])
            txt = token1[0]
            for (let i = 0; i < exp; i++) {
                txt += '0'
            }
        }

        let int: string = txt
        let dec: string = ''
        if (txt.indexOf('.') != -1) {
            let token0: string[] = txt.split('.')
            int = token0[0]
            dec = token0[1]
        }

        if (sigDig == 1) {
            dec = ''
        } else if (1 < sigDig && sigDig <= dec.length) {
            dec = '.' + dec.slice(0, sigDig - 1)
        } else if (dec.length < sigDig) {
            dec = '.' + dec
            for (let i = dec.length; i < sigDig; i++) {
                dec += '0'
            }
        }
        txt = int + dec
        console.log(val, txt, int, dec)
        return txt
    }

    public resize(w: number, h: number): void {
        this.width = w;
        this.height = h;
        this.draw();
    }

    public draw(): void {
        const me = this
        d3.select("svg").remove()
        if (this.groupKeyList.length > 0) {
            this.margin.left = 50 + (this.sigDigY - 3) * 6
            let chartW = this.width - this.margin.left - this.margin.right
            let chartH = this.height - this.margin.top - this.margin.bottom

            // SVG要素の作成
            const svg = d3.select("#view")
                .append("svg")
                .attr("id", "fig")
                .attr("width", this.width)
                .attr("height", this.height)
                .style('background-color', '#FFF')

            // スケール
            const xScale = d3.scaleLinear()
                .domain([this.xAxisMin, this.xAxisMax])
                .range([0, chartW]);
            const yScale = d3.scaleLinear()
                .domain([this.yAxisMin, this.yAxisMax])
                .range([chartH, 0]);


            // add X axis
            svg.append("g")
                .attr('class', 'axis')
                .attr('id', 'x-axis')
                .attr("transform", `translate(${this.margin.left}, ${chartH + this.margin.top})`)
                .attr("font-size", `${this.fontSize}px`)
                .call(d3.axisBottom(xScale));

            // Add Y axis
            svg.append("g")
                .attr('class', 'axis')
                .attr('id', 'y-axis')
                .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                .attr("font-size", `${this.fontSize}px`)
                .call(d3.axisLeft(yScale));
            // 軸の文字サイズ
            svg.selectAll('.axis > .domain').attr('stroke-width', '1.0')
            svg.selectAll('.axis > .tick > text').attr("font-size", `${this.fontSize}px`)
            // y軸の表記 有効数字と単位が可変
            $('#y-axis > .tick > text').each(function () {
                let buf: string = String($(this).text())
                // 負のとき、NaNになる問題の解決
                if (buf.search(/[^\d.]/g) === 0) {
                    buf = buf.replace(/[^\d.]/g, '')
                    let val: number = Number(buf) * -1
                    let txt: string = me.expFormat(val, me.expY, me.sigDigY)
                    $(this).text(txt)
                } else {
                    let val: number = Number(buf)
                    let txt: string = me.expFormat(val, me.expY, me.sigDigY)
                    $(this).text(txt)
                }
            })
            $('#x-axis > .tick > text').each(function () {
                let buf: string = String($(this).text())
                // 負のとき、NaNになる問題の解決
                if (buf.search(/[^\d.]/g) === 0) {
                    buf = buf.replace(/[^\d.]/g, '')
                    let val: number = Number(buf) * -1
                    let txt: string = me.expFormat(val, me.expX, me.sigDigX)
                    $(this).text(txt)
                } else {
                    let val: number = Number(buf)
                    let txt: string = me.expFormat(val, me.expX, me.sigDigX)
                    $(this).text(txt)
                }
            })

            // 枠で囲う
            if (this.frameVis) {
                svg.append("g")
                    .attr('class', 'frame')
                    .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                    .call(d3.axisTop(xScale).tickSize(0))
                svg.append("g")
                    .attr('class', 'frame')
                    .attr("transform", `translate(${this.margin.left + chartW}, ${this.margin.top})`)
                    .call(d3.axisRight(yScale).tickSize(0))
                svg.selectAll('.frame > .tick').remove()
                svg.selectAll('.axis > .domain').attr('stroke-width', '1.0')
                // svg.append('line')
                //     .attr('x1', 0)
                //     .attr('y1', 0)
                //     .attr('x2', chartW)
                //     .attr('y2', 0)
                //     .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                //     .attr("stroke-width", 1.0)
                //     .attr("stroke", '#000')
                // svg.append('line')
                //     .attr('x1', chartW)
                //     .attr('y1', 0)
                //     .attr('x2', chartW)
                //     .attr('y2', chartH)
                //     .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                //     .attr("stroke-width", 1.0)
                //     .attr("stroke", '#000')
            }

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
            // Chartの表示
            // Supreposeで描画
            for (let i = this.groupKeyList.length - 1; i > -1; i--) {
                const key: string = this.groupKeyList[i]
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
            }



            // 凡例
            let leX = this.legendPos.x
            let leY = this.legendPos.y
            for (let i = 0; i < this.groupKeyList.length; i++) {
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


                    if (this.maxVis) {
                        leY += 12
                        let maxCurrent: number = data.max().current
                        let maxPotential: number = 0
                        data.values.forEach(v => {
                            if (v.current === maxCurrent) {
                                maxPotential = v.potential
                            }
                        })
                        let x = this.expFormat(maxPotential, me.expX, me.sigDigX)
                        let y = this.expFormat(maxCurrent, me.expY, me.sigDigY)
                        svg.append('text')
                            .attr('x', leX + 30)
                            .attr('y', leY)
                            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                            .attr("font-size", `${this.fontSize}px`)
                            .text(`max(${x}, ${y})`)


                    }
                    if (this.minVis) {
                        leY += 12
                        let minCurrent: number = data.min().current
                        let minPotential: number = 0
                        data.values.forEach(v => {
                            if (v.current === minCurrent) {
                                minPotential = v.potential
                            }
                        })
                        let x = this.expFormat(minPotential, me.expX, me.sigDigX)
                        let y = this.expFormat(minCurrent, me.expY, me.sigDigY)
                        svg.append('text')
                            .attr('x', leX + 30)
                            .attr('y', leY)
                            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                            .attr("font-size", `${this.fontSize}px`)
                            .text(`min(${x}, ${y})`)
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
                    // .attr("x", this.margin.left + chartW / 2)
                    .attr("x", this.width / 2)
                    .attr("y", this.height - 5)
                    .attr("text-anchor", "bottom")
                    .attr("text-align", "center")
                    .attr("font-size", `${this.fontSize}px`)
                    .attr("font-family", "Arial")
                    .text(this.labelX);
            }


            // Y軸ラベルの描画
            if (this.labelyVis) {
                svg.append('text')
                    .attr("id", "svg-y-axis")
                    .attr("x", -this.margin.bottom - chartH / 2)
                    .attr("y", 10)
                    .attr("text-anchor", "top")
                    .attr("text-align", "center")
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
                    .attr("text-align", "center")
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


    public setUI() {
        const me = this
        $('#set-graph-title').val(this.titleLabel)
        $('#set-graph-label-x').val(this.labelX)
        $('#set-graph-label-y').val(this.labelY)


        if (String($('#x-axis-range-unit').find('option:selected').val()) === 'ratio') {
            let ratioMin = Math.round((this.potentialMin - this.xAxisMin) / (this.potentialMax - this.potentialMin) * 100)
            $('#x-axis-min').val(ratioMin)
            let ratioMax = Math.round((this.xAxisMax - this.potentialMax) / (this.potentialMax - this.potentialMin) * 100)
            $('#x-axis-max').val(ratioMax)
        }
        else if (String($('#x-axis-range-unit').find('option:selected').val()) === 'num') {
            $('#x-axis-min').val(this.xAxisMin)
            $('#x-axis-max').val(this.xAxisMax)
        }
        if (String($('#y-axis-range-unit').find('option:selected').val()) === 'ratio') {
            let ratioMin = Math.round((this.currentMin - this.yAxisMin) / (this.currentMax - this.currentMin) * 100)
            $('#y-axis-min').val(ratioMin)
            let ratioMax = Math.round((this.yAxisMax - this.currentMax) / (this.currentMax - this.currentMin) * 100)
            $('#y-axis-max').val(ratioMax)
        }
        else if (String($('#y-axis-range-unit').find('option:selected').val()) === 'num') {
            $('#y-axis-min').val(this.yAxisMin)
            $('#y-axis-max').val(this.yAxisMax)
        }


        this.groupKeyList.forEach(key => {
            let color = chroma(this.groupList[key].color).name()
            console.log(key, color)
            $('#' + key + '-color').val(color)
            $('#' + key + '-check').prop('checked', this.groupList[key].visible)
        })

        $('#title-vis').prop('checked', this.titleVis)
        $('#labelx-vis').prop('checked', this.labelxVis)
        $('#labely-vis').prop('checked', this.labelyVis)

        $('#line-weight-slider').val(this.lineWeight)
        $('#line-weight-slider').prev().text(`太さ : ${this.lineWeight.toFixed(1)}pt`)
        $('#fontsize-slider').val(10 / this.fontSize * 100)
        $('#fontsize-slider').prev().text(`文字サイズ : ${10 / this.fontSize * 100}%`)

        $('#max-vis').prop('checked', this.maxVis)
        $('#min-vis').prop('checked', this.minVis)
        $('#grid-vis').prop('checked', this.gridVis)
        $('#frame-vis').prop('checked', this.frameVis)
        $('#legend-vis').prop('checked', this.legendVis)
        $('#dash-line-mode').prop('checked', this.lineIsDash)

        $('#line-type-selector').find('option').each(function() {
            if ($(this).val() == me.lineType) {
                $(this).prop('selected', true)
            }
        })
        

        // $('#x-axis-min').val(this.potentialMin)
        // $('#x-axis-max').val(this.potentialMax)
        // $('#y-axis-min').val(this.expFromat(this.currentMin))
        // $('#y-axis-max').val(this.expFromat(this.currentMax))
    }

    public setXaxisMin(val: number) {
        this.xAxisMin = val
        this.draw()
    }
    public setXaxisMax(val: number) {
        this.xAxisMax = val
        this.draw()
    }
    public setXaxisMinRatio(ratio: number) {
        this.xAxisMin = this.potentialMin - (this.potentialMax - this.potentialMin) * ratio
        this.draw()
    }
    public setXaxisMaxRatio(ratio: number) {
        this.xAxisMax = this.potentialMax + (this.potentialMax - this.potentialMin) * ratio
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
    public setYaxisMinRatio(ratio: number) {
        this.yAxisMin = this.currentMin - (this.currentMax - this.currentMin) * ratio
        this.draw()
    }
    public setYaxisMaxRatio(ratio: number) {
        this.yAxisMax = this.currentMax + (this.currentMax - this.currentMin) * ratio
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
    public changeMaxVis(flag: boolean) {
        this.maxVis = flag
        this.draw()
    }
    public changeMinVis(flag: boolean) {
        this.minVis = flag
        this.draw()
    }

    public changeGridVis(flag: boolean) {
        this.gridVis = flag
        this.draw()
    }
    public changeFrameVis(flag: boolean) {
        this.frameVis = flag
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
        this.groupKeyList = list
        // this.groupKeyList = list.reverse()
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

    public changeSigDigX(val: number) {
        if (val > 0) this.sigDigX = val
        this.draw()
    }
    public changeSigDigY(val: number) {
        if (val > 0) this.sigDigY = val
        this.draw()
    }
    public changeExponentX(val: number) {
        this.expX = val
        this.draw()
    }
    public changeExponentY(val: number) {
        this.expY = val
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
    public changeLineType(type: string, isDash: boolean) {
        this.lineType = type
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
                let color = chroma.hsv(210, 1.0 - sat, 1.0)
                this.groupList[key].color = color.css()
                $('#' + key + '-color').val(color.name())
                this.groupList[key].dash = '1,0'
                sat += 0.8 / this.groupKeyList.length
            })
        }
        else if (type === 'sat_orange') {
            let sat = 0.2;
            this.groupKeyList.forEach(key => {
                let color = chroma.hsv(20, 1.0 - sat, 1.0)
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
        else if (type === 'mono') {
            this.groupKeyList.forEach(key => {
                this.groupList[key].dash = '1,0'
                this.groupList[key].color = '#000'
                $('#' + key + '-color').val('#000')
            })
        }

        this.lineIsDash = isDash
        if (isDash) {
            let segment = 1
            let span = 0
            let spanNum = 0
            this.groupKeyList.forEach(key => {
                let dash: string = `${segment}, ${span}`
                for (let i = 0; i < spanNum; i++) {
                    dash += `, ${span}, ${span}`
                }
                this.groupList[key].dash = dash
                if (span === 0) {
                    span = 2
                } else if (segment < 8) {
                    segment *= 2
                    span *= 2
                } else if (8 <= segment && spanNum === 0) {
                    span = 2
                    spanNum = 1
                } else {
                    spanNum++
                }
            })
        }

        this.draw()
    }


    public getDataList(): { [key: string]: Data } {
        return this.dataList
    }
    public getData(label: string): Data {
        return this.dataList[label]
    }
    public getGroup(label: string): DataSet {
        return this.groupList[label]
    }
    public getGroupKeyList(): string[] {
        return this.groupKeyList
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


    public getJSON(): string {

        let buf1: any[] = []
        for (let key in this.groupList) {
            const ds: DataSet = this.groupList[key]

            let buf: any[] = []
            ds.dataList.forEach(d => {
                let dataObj = {
                    "label": d.label,
                    "values": d.values
                }
                buf.push(dataObj)
            })

            let dataSetObj = {
                "color": ds.color,
                "dash": ds.dash,
                "vis": ds.visible,
                "label": ds.label,
                "values": ds.values,
                "data": buf
            }

            buf1.push(dataSetObj)
        }

        let obj = {
            "id": "cvviewer",
            "potential": {
                "min": this.potentialMin,
                "max": this.potentialMax
            },
            "current": {
                "min": this.currentMin,
                "max": this.currentMax
            },
            "title": {
                "text": this.titleLabel,
                "vis": this.titleVis
            },
            "axis": {
                "x": {
                    "text": this.labelX,
                    "min": this.xAxisMin,
                    "max": this.xAxisMax,
                    "vis": this.labelxVis,
                    "sigDig": this.sigDigX,
                    "exp": this.expX
                },
                "y": {
                    "text": this.labelY,
                    "min": this.yAxisMin,
                    "max": this.yAxisMax,
                    "vis": this.labelyVis,
                    "sigDig": this.sigDigY,
                    "exp": this.expY
                }
            },
            "style": {
                "frame": this.frameVis,
                "fontSize": this.fontSize,
                "lineWeight": this.lineWeight,
                "dash": this.lineIsDash,
                "lineType": this.lineType,
                "margin": this.margin,
                "grid": this.gridVis,
            },
            "legend": {
                "vis": this.legendVis,
                "max": this.maxVis,
                "min": this.minVis,
                "pos": this.legendPos
            },
            "dataSet": buf1
        }

        return JSON.stringify(obj)
    }

    public setJSON(text: string) {
        const json = JSON.parse(text)
        console.log('set JSON')
        console.log(json)
        this.potentialMax = json.potential.max
        this.potentialMin = json.potential.min
        this.currentMax = json.current.max
        this.currentMin = json.current.min

        this.labelX = json.axis.x.text
        this.labelxVis = json.axis.x.vis
        this.xAxisMax = json.axis.x.max
        this.xAxisMin = json.axis.x.min
        this.sigDigX = json.axis.x.sigDig
        this.expX = json.axis.x.exp

        this.labelY = json.axis.y.text
        this.labelyVis = json.axis.y.vis
        this.yAxisMax = json.axis.y.max
        this.yAxisMin = json.axis.y.min
        this.sigDigY = json.axis.y.sigDig
        this.expY = json.axis.y.exp

        this.titleLabel = json.title.text
        this.titleVis = json.title.vis

        this.frameVis = json.style.frame
        this.fontSize = json.style.fontSize
        this.lineWeight = json.style.lineWeight
        this.lineIsDash = json.style.dash
        this.lineType = json.style.lineType
        this.margin = json.style.margin
        this.gridVis = json.style.grid

        this.legendVis = json.legend.vis
        this.maxVis = json.legend.max
        this.minVis = json.legend.min
        this.legendPos = json.legend.pos

        this.groupList = {}
        json.dataSet.forEach((jds: any) => {
            let dataList: Data[] = []
            jds.data.forEach((jd: any) => {
                let data: Data = new Data(jd.label)
                data.values = jd.values
                dataList.push(data)
                this.dataList[jd.label] = data
            })

            let dataSet: DataSet = new DataSet(jds.label, dataList)
            dataSet.dash = jds.dash
            dataSet.visible = jds.vis
            dataSet.color = jds.color
            dataSet.values = jds.values
            this.groupList[jds.label] = dataSet
            // console.log(this.groupList[jds.label])
        })

        this.groupKeyList = Object.keys(this.groupList)

        this.draw()
    }
}