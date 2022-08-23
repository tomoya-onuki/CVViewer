import chroma from 'chroma-js';
import * as d3 from 'd3';
import { randomIrwinHall, select, style, svg } from 'd3';
import $ = require('jquery');
import { Data } from './Data';
import { DataSet } from './DataSet';
declare var require: any;

export class Chart {
    private width: number;
    private height: number;
    private margin: { [key: string]: number } = {
        'top': 50, 'bottom': 50, 'right': 20, 'left': 80
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

    private xTicksSize: number = 5
    private yTicksSize: number = 5

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

    private ticksStepX: number = 0.05
    private ticksX: number[] = []
    private ticksStepY: number = 0.5e-6
    private ticksY: number[] = []

    private firstDraw: boolean = true

    private selectedText: string = 'none'
    private labelStyle: { [key: string]: LabelStyle } = {}

    private lineWeight: number = 1.5;
    private lineIsDash: boolean = false
    private lineType: string = 'mono'

    constructor() {
        this.width = Number($('#svg-width').val())
        this.height = Number($('#svg-height').val())

        this.labelStyle = {
            labelx: new LabelStyle(),
            labely: new LabelStyle(),
            title: new LabelStyle(),
            legend: new LabelStyle(),
            axisx: new LabelStyle(),
            axisy: new LabelStyle()
            // labelx: new LabelStyle(this.width, this.height),
            // labely: new LabelStyle(this.width, this.height),
            // title: new LabelStyle(this.width, this.height),
            // legend: new LabelStyle(this.width, this.height),
            // axisx: new LabelStyle(this.width, this.height),
            // axisy: new LabelStyle(this.width, this.height)
        }
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



    private expFormat(str: string, exponent: number, sigDig: number): string {
        // console.log(`Input: ${str}, ${exponent}`)

        let txt: string = str
        // 指数表記の時
        if (str.indexOf('e') != -1) {
            let token1: string[] = txt.split('e')
            let exp: number = parseFloat(token1[1])
            exponent = exponent - exp
            txt = token1[0]
        }

        // console.log(`E check: ${str}, ${exponent}`)
        if (txt.indexOf('e') == -1) {
            // マイナスをとる
            txt = txt.replace(/[^\d.]/g, '')

            // 小数点がないときはつける
            if (str.indexOf('.') == -1) txt = txt + '.0'

            if (exponent != 0) {
                // 十分な長さにする
                txt = Array(Math.abs(exponent) + 1).join('0') + txt + Array(Math.abs(exponent) + 1).join('0')
                // console.log(`join 0: ${txt}`)

                // 小数点の位置を探す
                let p = txt.indexOf('.')
                // 小数点を削除
                txt = txt.replace('.', '')

                // 整数部と小数部に分割
                let i = txt.slice(0, p - exponent) // 整数部
                let d = txt.slice(p - exponent) // 小数部

                // console.log(`divide: ${i} . ${d}`)

                // 整数部の頭が0の連続の時
                if (i.search(/0+/g) === 0) {
                    // 0でなくなる位置をさがす
                    let e = i.search(/[^0]/g)
                    // あればスライスし、なければ0にする
                    if (e != -1) {
                        i = i.slice(e)
                    } else {
                        i = '0'
                    }
                }
                txt = i + '.' + d
            }

            // マイナスをつける
            if (str.search(/[^\d.]/g) === 0) {
                txt = '-' + txt
            }
        }


        // 有効桁数を指定
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
        // console.log(val, txt, int, dec)
        return txt
    }

    public resize(w: number, h: number): void {
        this.width = w
        this.height = h
        // this.firstDraw = true
    }

    public draw(): void {
        const me = this
        d3.select("svg").remove()
        if (this.groupKeyList.length > 0) {

            // SVG要素の作成
            const svg = d3.select("#view")
                .append("svg")
                .attr("id", "fig")
                .attr("width", this.width)
                .attr("height", this.height)
                .style("background-color", "#FFF")

            let chartW = this.width - this.margin.left - this.margin.right
            let chartH = this.height - this.margin.top - this.margin.bottom


            Object.keys(this.labelStyle).forEach(key => {
                this.labelStyle[key].width = chartW
                this.labelStyle[key].height = chartH

                // console.log(`${key} : (point ) ${this.labelStyle[key].posX.toFixed(3)}, ${this.labelStyle[key].posY.toFixed(3)}`)
                // console.log(`${key} : (ratio ) ${this.labelStyle[key].posRatio.x.toFixed(3)}, ${this.labelStyle[key].posRatio.y.toFixed(3)}`)
                // console.log(`${key} : (offset) ${this.labelStyle[key].offsetX.toFixed(3)}, ${this.labelStyle[key].offsetY.toFixed(3)}`)

            })


            // スケール
            const xScale = d3.scaleLinear()
                .domain([this.xAxisMin, this.xAxisMax])
                .range([0, chartW]);
            const yScale = d3.scaleLinear()
                .domain([this.yAxisMin, this.yAxisMax])
                .range([chartH, 0]);

            // 目盛りの数値を設定する
            this.ticksX = []
            this.ticksY = []
            // 0基準でつくる
            for (let x = 0; x > this.xAxisMin; x -= this.ticksStepX) {
                this.ticksX.push(x)
            }
            for (let x = 0; x <= this.xAxisMax; x += this.ticksStepX) {
                this.ticksX.push(x)
            }
            for (let y = 0; y > this.yAxisMin; y -= this.ticksStepY) {
                this.ticksY.push(y)
            }
            for (let y = 0; y <= this.yAxisMax; y += this.ticksStepY) {
                this.ticksY.push(y)
            }
            // 範囲外を削除
            this.ticksX = this.ticksX.filter(x => this.xAxisMin <= x && x <= this.xAxisMax)
            this.ticksY = this.ticksY.filter(y => this.yAxisMin <= y && y <= this.yAxisMax)
            // 重複の削除
            this.ticksX = Array.from(new Set(this.ticksX))
            this.ticksY = Array.from(new Set(this.ticksY))

            // const xAxisOut = d3.axisBottom(xScale)
            //     .tickFormat(d3.format('e'))
            //     .tickValues(this.ticksX)
            // const xAxisIn = d3.axisTop(xScale)
            //     .tickFormat(d3.format('e'))
            //     .tickValues(this.ticksX)

            // const yAxisOut = d3.axisLeft(yScale)
            //     .tickFormat(d3.format('e'))
            //     .tickValues(this.ticksY)
            // const yAxisIn = d3.axisRight(yScale)
            //     .tickFormat(d3.format('e'))
            //     .tickValues(this.ticksY)

            // add X axis
            svg.append("g")
                .attr('class', 'axis')
                .attr('id', 'x-axis')
                .attr("transform", `translate(${this.margin.left}, ${chartH + this.margin.top})`)
                .attr("font-size", `${this.labelStyle.axisx.size}px`)
                .attr("font-weight", this.labelStyle.axisx.bold ? 'bold' : 'nomal')
                .attr("font-style", this.labelStyle.axisx.italic ? 'italic' : 'nomal')
                .attr('font-family', this.labelStyle.axisx.font)
                .attr("cursor", "pointer")
                .call(d3.axisBottom(xScale)
                    .tickFormat(d3.format('e'))
                    .tickValues(this.ticksX)
                    .tickSize(this.xTicksSize))
                .on('click', function () {
                    if (me.selectedText != 'axisx') {
                        me.selectedText = 'axisx'
                    } else {
                        me.selectedText = 'none'
                    }
                    $('.select-box').hide()
                    $(`#select-box-${me.selectedText}`).show()
                    me.setFontStyleUI()
                })
            $('#x-axis > .tick > text')
                .attr("font-size", `${this.labelStyle.axisx.size}px`)
                .attr('font-family', this.labelStyle.axisx.font)
            // 選択範囲
            svg.append('rect')
                .attr('id', 'select-box-axisx')
                .attr('class', 'select-box')
                .attr('width', chartW)
                .attr('height', 30)
                .attr('fill', 'none')
                .attr('stroke', '#4287f5')
                .attr('display', 'none')
                .attr("transform", `translate(${me.margin.left}, ${chartH + me.margin.top})`)

            // Add Y axis
            svg.append("g")
                .attr('class', 'axis')
                .attr('id', 'y-axis')
                .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                .attr("font-weight", this.labelStyle.axisy.bold ? 'bold' : 'nomal')
                .attr("font-style", this.labelStyle.axisy.italic ? 'italic' : 'nomal')
                .attr("cursor", "pointer")
                .call(d3.axisLeft(yScale)
                    .tickFormat(d3.format('e'))
                    .tickValues(this.ticksY)
                    .tickSize(this.yTicksSize))
                .on('click', function (e) {
                    if (me.selectedText != 'axisy') {
                        me.selectedText = 'axisy'
                    } else {
                        me.selectedText = 'none'
                    }
                    $('.select-box').hide()
                    $(`#select-box-${me.selectedText}`).show()
                    me.setFontStyleUI()
                })
            $('#y-axis > .tick > text')
                .attr("font-size", `${this.labelStyle.axisy.size}px`)
                .attr('font-family', this.labelStyle.axisy.font)
            svg.append('rect')
                .attr('id', 'select-box-axisy')
                .attr('class', 'select-box')
                .attr('width', 30)
                .attr('height', chartH)
                .attr('fill', 'none')
                .attr('stroke', '#4287f5')
                .attr('display', 'none')
                .attr("transform", `translate(${me.margin.left - 30}, ${me.margin.top})`)


            // y軸の表記 有効数字と単位が可変
            $('#y-axis > .tick > text').each(function () {
                let val: string = String($(this).text())
                let txt: string = me.expFormat(val, me.expY, me.sigDigY)
                $(this).text(txt)
            })
            $('#x-axis > .tick > text').each(function () {
                let val: string = String($(this).text())
                let txt: string = me.expFormat(val, me.expX, me.sigDigX)
                $(this).text(txt)
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
            }


            // グリッド
            if (this.gridVis) {
                // 軸のticksを大きくしてグリッドにする
                svg.append("g")
                    .attr("transform", `translate(${this.margin.left}, ${chartH + this.margin.top})`)
                    .attr('class', 'grid')
                    .call(d3.axisBottom(xScale).tickSize(-chartH));
                svg.append("g")
                    .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                    .attr('class', 'grid')
                    .call(d3.axisLeft(yScale).tickFormat(d3.format('e')).tickSize(-chartW));
                // 罫線のスタイル
                d3.selectAll('.grid > .tick > line')
                    .attr("stroke-width", 0.5)
                    .attr("stroke", '#ddd')
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
            let leX = this.labelStyle.legend.posX
            let leY = this.labelStyle.legend.posY
            if (this.legendVis) {
                const legend = svg.append("g")
                    .attr('id', 'legend')
                    .attr("cursor", "pointer")

                for (let i = 0; i < this.groupKeyList.length; i++) {
                    const key: string = this.groupKeyList[i]
                    const data: DataSet = this.groupList[key]
                    if (data.visible) {

                        legend.append("line")
                            .attr("x1", leX)
                            .attr("x2", leX + 30)
                            .attr("y1", leY - 3)
                            .attr("y2", leY - 3)
                            .attr("stroke-dasharray", data.dash)
                            .attr("stroke-width", 2)
                            .attr("stroke", data.color)
                            .attr("transform", `translate(${me.margin.left + me.labelStyle.legend.offsetX}, ${me.margin.top + me.labelStyle.legend.offsetY})`)
                        legend.append('text')
                            .attr("x", leX + 35)
                            .attr("y", leY)
                            .attr("font-size", `${this.labelStyle.legend.size}px`)
                            .attr("font-weight", this.labelStyle.legend.bold ? 'bold' : 'nomal')
                            .attr("font-style", this.labelStyle.legend.italic ? 'italic' : 'nomal')
                            .attr('font-family', this.labelStyle.legend.font)
                            .attr("transform", `translate(${me.margin.left + me.labelStyle.legend.offsetX}, ${me.margin.top + me.labelStyle.legend.offsetY})`)
                            .text(data.label)


                        if (this.maxVis) {
                            leY += (this.labelStyle.legend.size * 1.2)
                            let maxCurrent: number = data.max().current
                            let maxPotential: number = 0
                            data.values.forEach(v => {
                                if (v.current === maxCurrent) {
                                    maxPotential = v.potential
                                }
                            })
                            let x = this.expFormat(maxPotential.toString(), me.expX, me.sigDigX)
                            let y = this.expFormat(maxCurrent.toString(), me.expY, me.sigDigY)
                            legend.append('text')
                                .attr('x', leX + 35)
                                .attr('y', leY)
                                .attr("font-size", `${this.labelStyle.legend.size}px`)
                                .attr("font-weight", this.labelStyle.legend.bold ? 'bold' : 'nomal')
                                .attr("font-style", this.labelStyle.legend.italic ? 'italic' : 'nomal')
                                .attr('font-family', this.labelStyle.legend.font)
                                .attr("transform", `translate(${me.margin.left + me.labelStyle.legend.offsetX}, ${me.margin.top + me.labelStyle.legend.offsetY})`)
                                .text(`max(${x}, ${y})`)


                        }
                        if (this.minVis) {
                            leY += (this.labelStyle.legend.size * 1.2)
                            let minCurrent: number = data.min().current
                            let minPotential: number = 0
                            data.values.forEach(v => {
                                if (v.current === minCurrent) {
                                    minPotential = v.potential
                                }
                            })
                            let x = this.expFormat(minPotential.toString(), me.expX, me.sigDigX)
                            let y = this.expFormat(minCurrent.toString(), me.expY, me.sigDigY)
                            legend.append('text')
                                .attr('x', leX + 35)
                                .attr('y', leY)
                                .attr("font-size", `${this.labelStyle.legend.size}px`)
                                .attr("font-weight", this.labelStyle.legend.bold ? 'bold' : 'nomal')
                                .attr("font-style", this.labelStyle.legend.italic ? 'italic' : 'nomal')
                                .attr('font-family', this.labelStyle.legend.font)
                                .attr("transform", `translate(${me.margin.left + me.labelStyle.legend.offsetX}, ${me.margin.top + me.labelStyle.legend.offsetY})`)
                                .text(`min(${x}, ${y})`)
                        }
                        leY += 20
                    }
                }

                legend.on('click', function () {
                    if (me.selectedText != 'legend') {
                        me.selectedText = 'legend'
                    } else {
                        me.selectedText = 'none'
                    }
                    $('.select-box').hide()
                    $(`#select-box-${me.selectedText}`).show()
                    me.setFontStyleUI()
                })
                let labelElem: any = document.querySelector('#legend')
                if (labelElem) {
                    var bbox = labelElem.getBBox()

                    svg.append('rect')
                        .attr('id', 'select-box-legend')
                        .attr('class', 'select-box')
                        .attr('width', bbox.width)
                        .attr('height', leY - me.labelStyle.legend.posY)
                        .attr('fill', 'none')
                        .attr('stroke', '#4287f5')
                        .attr('display', 'none')
                        .attr("transform", `translate(${me.margin.left + me.labelStyle.legend.offsetX}, ${me.margin.top + me.labelStyle.legend.offsetY})`)
                        .attr("x", me.labelStyle.legend.posX)
                        .attr("y", me.labelStyle.legend.posY - 10)
                    // .attr("transform", `translate(${}, ${})`)
                }
            }




            // X軸ラベルの描画
            if (this.labelxVis) {
                svg.append('text')
                    .attr("id", "labelx")
                    .attr("x", this.labelStyle.labelx.posX)
                    .attr("y", this.labelStyle.labelx.posY)
                    .attr("text-anchor", "bottom")
                    .attr("text-align", "center")
                    .attr("font-size", `${this.labelStyle.labelx.size}px`)
                    .attr("font-family", this.labelStyle.labelx.font)
                    .attr("font-weight", this.labelStyle.labelx.bold ? 'bold' : 'nomal')
                    .attr("font-style", this.labelStyle.labelx.italic ? 'italic' : 'nomal')
                    .attr("transform", `translate(${me.margin.left + me.labelStyle.labelx.offsetX}, ${me.margin.top + me.labelStyle.labelx.offsetY})`)
                    .attr("cursor", "pointer")
                    .text(this.labelX)
                    .on('click', function () {
                        if (me.selectedText != 'labelx') {
                            me.selectedText = 'labelx'
                        } else {
                            me.selectedText = 'none'
                        }
                        $('.select-box').hide()
                        $(`#select-box-${me.selectedText}`).show()
                        // console.log(me.labelStyle[me.selectedText].posRatio)
                        // console.log(me.labelStyle[me.selectedText].posX, me.labelStyle[me.selectedText].posY)
                        me.setFontStyleUI()
                    })
                let labelElem: any = document.querySelector('#labelx')
                if (labelElem) {
                    var bbox = labelElem.getBBox()
                    svg.append('rect')
                        .attr('id', 'select-box-labelx')
                        .attr('class', 'select-box')
                        .attr('width', bbox.width + 4)
                        .attr('height', bbox.height + 4)
                        .attr('fill', 'none')
                        .attr('stroke', '#4287f5')
                        .attr('display', 'none')
                        .attr("transform", `translate(${me.margin.left + me.labelStyle.labelx.offsetX}, ${me.margin.top + me.labelStyle.labelx.offsetY})`)
                        .attr("x", bbox.x - 2)
                        .attr("y", bbox.y - 2)
                    // .attr("transform", `translate(${bbox.x - 2}, ${bbox.x - 2})`)
                }
            }


            // Y軸ラベルの描画
            if (this.labelyVis) {
                svg.append('text')
                    .attr("id", "labely")
                    .attr("x", this.labelStyle.labely.posX)
                    .attr("y", this.labelStyle.labely.posY)
                    .attr("text-anchor", "top")
                    .attr("text-align", "center")
                    .attr("font-size", `${this.labelStyle.labely.size}px`)
                    .attr("font-family", this.labelStyle.labely.font)
                    .attr("font-weight", this.labelStyle.labely.bold ? 'bold' : 'nomal')
                    .attr("font-style", this.labelStyle.labely.italic ? 'italic' : 'nomal')
                    .attr("cursor", "pointer")
                    .attr("transform", `rotate(-90) translate(${-me.margin.top + me.labelStyle.labely.offsetX}, ${me.margin.left + me.labelStyle.labely.offsetY})`)
                    .text(this.labelY)
                    .on('click', function () {
                        if (me.selectedText != 'labely') {
                            me.selectedText = 'labely'
                        } else {
                            me.selectedText = 'none'
                        }
                        $('.select-box').hide()
                        $(`#select-box-${me.selectedText}`).show()

                        me.setFontStyleUI()
                    })
                let labelElem: any = document.querySelector('#labely')
                if (labelElem) {
                    var bbox = labelElem.getBBox()
                    svg.append('rect')
                        .attr('id', 'select-box-labely')
                        .attr('class', 'select-box')
                        .attr('width', bbox.width + 4)
                        .attr('height', bbox.height + 4)
                        .attr('fill', 'none')
                        .attr('stroke', '#4287f5')
                        .attr('display', 'none')
                        .attr("x", this.labelStyle.labely.posX)
                        .attr("y", this.labelStyle.labely.posY - bbox.height)
                        .attr("transform", `rotate(-90) translate(${-me.margin.top + me.labelStyle.labely.offsetX}, ${me.margin.left + me.labelStyle.labely.offsetY})`)
                    // .attr("transform", "rotate(-90)")
                    // .attr("transform", `translate(${bbox.x - 2}, ${bbox.y - 2})`)
                }
            }

            // タイトルラベル
            if (this.titleVis) {
                svg.append("text")
                    .attr("id", "title")
                    .attr("x", this.labelStyle.title.posX)
                    .attr("y", this.labelStyle.title.posY)
                    .attr("font-size", `${this.labelStyle.title.size}px`)
                    .attr("text-anchor", "top")
                    .attr("text-align", "center")
                    .attr("font-family", this.labelStyle.title.font)
                    .attr("font-weight", this.labelStyle.title.bold ? 'bold' : 'nomal')
                    .attr("font-style", this.labelStyle.title.italic ? 'italic' : 'nomal')
                    .attr("cursor", "pointer")
                    .attr("transform", `translate(${me.margin.left + me.labelStyle.title.offsetX}, ${me.margin.top + me.labelStyle.title.offsetY})`)
                    .text(this.titleLabel)
                    .on('click', function () {
                        if (me.selectedText != 'title') {
                            me.selectedText = 'title'
                        } else {
                            me.selectedText = 'none'
                        }
                        $('.select-box').hide()
                        $(`#select-box-${me.selectedText}`).show()
                        // console.log(me.labelStyle[me.selectedText].posRatio)
                        // console.log(me.labelStyle[me.selectedText].posX, me.labelStyle[me.selectedText].posY)
                        me.setFontStyleUI()
                    })
                let labelElem: any = document.querySelector('#title')
                if (labelElem) {
                    var bbox = labelElem.getBBox()
                    svg.append('rect')
                        .attr('id', 'select-box-title')
                        .attr('class', 'select-box')
                        .attr('width', bbox.width + 4)
                        .attr('height', bbox.height + 4)
                        .attr('fill', 'none')
                        .attr('stroke', '#4287f5')
                        .attr('display', 'none')
                        .attr("transform", `translate(${me.margin.left + me.labelStyle.title.offsetX}, ${me.margin.top + me.labelStyle.title.offsetY})`)
                        .attr("x", bbox.x - 2)
                        .attr("y", bbox.y - 2)
                    // .attr("transform", `translate(${bbox.x - 2}, ${bbox.y - 2})`)
                }
            }


            $('.select-box').hide()
            $(`#select-box-${this.selectedText}`).show()

            // ラベル位置の初期化
            if (this.firstDraw) {

                this.selectedText = 'title'
                this.alignLabelPos('top')
                this.alignLabelPos('hcenter')
                this.selectedText = 'labelx'
                this.alignLabelPos('bottom')
                this.alignLabelPos('hcenter')
                this.selectedText = 'labely'
                this.alignLabelPos('left')
                this.alignLabelPos('vcenter')

                this.selectedText = 'legend'
                this.alignLabelPos('left')
                this.alignLabelPos('top')
                // this.changeLabelPos(10 + this.margin.top, 10 + this.margin.left)

                this.selectedText = 'none'

                this.firstDraw = false
            }
        }
    }


    public setTitleLabel(label: string): void {
        this.titleLabel = label;
        ;
    }

    public setAxisLabelX(label: string): void {
        this.labelX = label;
        ;
    }

    public setAxisLabelY(label: string): void {
        this.labelY = label;
        ;
    }


    public setUI() {
        const me = this
        $('#set-graph-title').val(this.titleLabel)
        $('#set-graph-label-x').val(this.labelX)
        $('#set-graph-label-y').val(this.labelY)


        $('#margin-top').val(this.margin.top)
        $('#margin-bottom').val(this.margin.bottom)
        $('#margin-left').val(this.margin.left)
        $('#margin-right').val(this.margin.right)

        $('#svg-width').val(this.width)
        $('#svg-height').val(this.height)


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
            $('#' + key + '-color').val(color)
            $('#' + key + '-check').prop('checked', this.groupList[key].visible)
        })

        $('#title-vis').prop('checked', this.titleVis)
        $('#labelx-vis').prop('checked', this.labelxVis)
        $('#labely-vis').prop('checked', this.labelyVis)

        $('#line-weight-slider').val(this.lineWeight)
        $('#line-weight-slider').prev().text(`太さ : ${this.lineWeight.toFixed(1)}pt`)
        // $('#fontsize-slider').val(10 / this.fontSize * 100)
        // $('#fontsize-slider').prev().text(`サイズ : ${10 / this.fontSize * 100}%`)

        $('#max-vis').prop('checked', this.maxVis)
        $('#min-vis').prop('checked', this.minVis)
        $('#grid-vis').prop('checked', this.gridVis)
        $('#frame-vis').prop('checked', this.frameVis)
        $('#legend-vis').prop('checked', this.legendVis)
        $('#dash-line-mode').prop('checked', this.lineIsDash)

        $('#line-type-selector').find('option').each(function () {
            if ($(this).val() == me.lineType) {
                $(this).prop('selected', true)
            }
        })

        let expx = this.expX >= 0 ? `e+${this.expX}` : `e${this.expX}`
        let expy = this.expY >= 0 ? `e+${this.expY}` : `e${this.expY}`
        $('#x-axis-unit').val(expx)
        $('#y-axis-unit').val(expy)


        if (this.xTicksSize < 0) {
            $('#x-axis-direction').find('option').each(function () {
                if (String($(this).val()) === 'in') {
                    $(this).prop('selected', true)
                } else {
                    $(this).prop('selected', false)
                }
            })
        }
        else if (this.xTicksSize > 0) {
            $('#x-axis-direction').find('option').each(function () {
                if (String($(this).val()) === 'out') {
                    $(this).prop('selected', true)
                } else {
                    $(this).prop('selected', false)
                }
            })
        }
        if (this.yTicksSize < 0) {
            $('#y-axis-direction').find('option').each(function () {
                if (String($(this).val()) === 'in') {
                    $(this).prop('selected', true)
                } else {
                    $(this).prop('selected', false)
                }
            })
        }
        else if (this.yTicksSize > 0) {
            $('#y-axis-direction').find('option').each(function () {
                if (String($(this).val()) === 'out') {
                    $(this).prop('selected', true)
                } else {
                    $(this).prop('selected', false)
                }
            })
        }

        // $('#x-axis-min').val(this.potentialMin)
        // $('#x-axis-max').val(this.potentialMax)
        // $('#y-axis-min').val(this.expFromat(this.currentMin))
        // $('#y-axis-max').val(this.expFromat(this.currentMax))
    }

    public setXaxisMin(val: number) {
        this.xAxisMin = val

    }
    public setXaxisMax(val: number) {
        this.xAxisMax = val

    }
    public setXaxisMinRatio(ratio: number) {
        this.xAxisMin = this.potentialMin - (this.potentialMax - this.potentialMin) * ratio

    }
    public setXaxisMaxRatio(ratio: number) {
        this.xAxisMax = this.potentialMax + (this.potentialMax - this.potentialMin) * ratio

    }
    public setYaxisMin(val: number) {
        this.yAxisMin = val

    }
    public setYaxisMax(val: number) {
        this.yAxisMax = val

    }
    public setYaxisMinRatio(ratio: number) {
        this.yAxisMin = this.currentMin - (this.currentMax - this.currentMin) * ratio

    }
    public setYaxisMaxRatio(ratio: number) {
        this.yAxisMax = this.currentMax + (this.currentMax - this.currentMin) * ratio

    }
    public changeTitleVis(flag: boolean) {
        this.titleVis = flag

    }
    public changeLabelxVis(flag: boolean) {
        this.labelxVis = flag

    }
    public changeLabelyVis(flag: boolean) {
        this.labelyVis = flag

    }
    public changeLegendVis(flag: boolean) {
        this.legendVis = flag

    }
    public changeMaxVis(flag: boolean) {
        this.maxVis = flag

    }
    public changeMinVis(flag: boolean) {
        this.minVis = flag

    }

    public changeGridVis(flag: boolean) {
        this.gridVis = flag

    }
    public changeFrameVis(flag: boolean) {
        this.frameVis = flag

    }

    public changeXTicksSize(type: string) {
        if (type === 'out')
            this.xTicksSize = 5
        else if (type === 'in')
            this.xTicksSize = -5
        else if (type === 'none')
            this.xTicksSize = 0

    }
    public changeYTicksSize(type: string) {
        if (type === 'out')
            this.yTicksSize = 5
        else if (type === 'in')
            this.yTicksSize = -5
        else if (type === 'none')
            this.yTicksSize = 0

    }


    public setFontStyleUI() {
        const me = this
        $('#font-style-bold-btn').prop('checked', this.labelStyle[this.selectedText].bold)
        $('#font-style-italic-btn').prop('checked', this.labelStyle[this.selectedText].italic)
        $('#fontsize').val(this.labelStyle[this.selectedText].size ? this.labelStyle[this.selectedText].size : 10)
        $('#font-selector').find('input[type="radio"]').each(function () {
            if ($(this).val() == me.labelStyle[me.selectedText].font) {
                $(this).prop('checked', true)
            } else {
                $(this).prop('checked', false)
            }
        })
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

            this.setUI()
        }
        // console.log(groupDataList)
        // console.log(this.groupList)

    }

    public sortGroupKeyList(list: string[]) {
        this.groupKeyList = list
    }
    public reverseGroupKeyList() {
        this.groupKeyList.reverse()
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

    }
    public changeDataVisible(label: string, flag: boolean) {
        this.groupList[label].visible = flag

    }
    public changeDataColor(label: string, color: string) {
        this.groupList[label].color = color

    }
    public removeGroup(label: string) {
        delete this.groupList[label]
        this.sortGroupKeyList(Object.keys(this.groupList))

    }
    public changeGroupLabel(key: string, newLabel: string) {
        this.groupList[key].label = newLabel
        this.sortGroupKeyList(Object.keys(this.groupList))

    }

    public changeSigDigX(val: number) {
        if (val > 0) this.sigDigX = val

    }
    public changeSigDigY(val: number) {
        if (val > 0) this.sigDigY = val

    }
    public changeExponentX(val: number) {
        this.expX = val

    }
    public changeExponentY(val: number) {
        this.expY = val

    }

    public changeTicksStepX(val: number) {
        this.ticksStepX = val

    }
    public changeTicksStepY(val: number) {
        this.ticksStepY = val

    }

    public changeFontSize(val: number) {
        this.labelStyle[this.selectedText].size = val

        // 縦軸の目盛りの文字の長さに応じてmarginを調整
        const text = this.expFormat(this.currentMax.toString(), this.expY, this.sigDigY)
        this.margin.left = 30 + text.length * this.labelStyle.axisy.size * 0.75

    }
    public changeFontBold(flag: boolean) {
        this.labelStyle[this.selectedText].bold = flag

    }
    public changeFontItalic(flag: boolean) {
        this.labelStyle[this.selectedText].italic = flag

    }
    public changeFont(font: string) {
        this.labelStyle[this.selectedText].font = font

    }

    public changeLineWeight(w: number) {
        this.lineWeight = w

    }
    public changeLineColorScheme(type: string) {
        this.lineType = type
        if (type === 'hue') {
            let hue = 0;
            this.groupKeyList.forEach(key => {
                let color = chroma.hsv(hue, 0.5, 0.9)
                this.groupList[key].color = color.css()
                $('#' + key + '-color').val(color.name())
                hue += 360 / this.groupKeyList.length
            })
        }
        else if (type === 'sat_blue') {
            let sat = 0.2;
            this.groupKeyList.forEach(key => {
                let color = chroma.hsv(210, 1.0 - sat, 1.0)
                this.groupList[key].color = color.css()
                $('#' + key + '-color').val(color.name())
                sat += 0.8 / this.groupKeyList.length
            })
        }
        else if (type === 'sat_orange') {
            let sat = 0.2;
            this.groupKeyList.forEach(key => {
                let color = chroma.hsv(20, 1.0 - sat, 1.0)
                this.groupList[key].color = color.css()
                $('#' + key + '-color').val(color.name())
                sat += 0.8 / this.groupKeyList.length
            })
        }
        else if (type === 'bri') {
            let bri = 0.2;
            this.groupKeyList.forEach(key => {
                let color = chroma.hsv(210, 0, bri)
                this.groupList[key].color = color.css()
                $('#' + key + '-color').val(color.name())
                bri += 0.8 / this.groupKeyList.length
            })
        }
        else if (type === 'mono') {
            this.groupKeyList.forEach(key => {
                this.groupList[key].color = '#000000'
                $('#' + key + '-color').val('#000000')
            })
        }
    }
    public changeLineDashed(isDash: boolean) {
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
        } else {
            this.groupKeyList.forEach(key => {
                this.groupList[key].dash = '1,0'
            })
        }


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

    }


    public changeMargin(key: string, val: number) {
        this.margin[key] = val

    }

    public addLabelPos(addX: number, addY: number) {
        if (this.selectedText != 'none') {
            if (this.selectedText === 'labely') {
                let x = this.labelStyle[this.selectedText].posX - addY
                let y = this.labelStyle[this.selectedText].posY + addX
                this.changeLabelPos(x, y)
            } else {
                let x = this.labelStyle[this.selectedText].posX + addX
                let y = this.labelStyle[this.selectedText].posY + addY
                this.changeLabelPos(x, y)
            }
        }
    }
    public changeLabelPos(x: number, y: number) {
        if (this.selectedText != 'none') {

            this.labelStyle[this.selectedText].posX = x
            this.labelStyle[this.selectedText].posY = y

            d3.select(`#${this.selectedText}`)
                .attr('x', this.labelStyle[this.selectedText].posX)
                .attr('y', this.labelStyle[this.selectedText].posY)

            if (this.selectedText != 'legend') {
                let labelElem: any = document.querySelector(`#${this.selectedText}`)
                if (labelElem) {
                    var bbox = labelElem.getBBox()
                    d3.select(`#select-box-${this.selectedText}`)
                        .attr('width', bbox.width + 4)
                        .attr('height', bbox.height + 4)
                        .attr("x", this.labelStyle[this.selectedText].posX - 2)
                        .attr("y", this.labelStyle[this.selectedText].posY - bbox.height)
                }
            } else {

                d3.select(`#select-box-${this.selectedText}`)
                    .attr("x", this.labelStyle.legend.posX)
                    .attr("y", this.labelStyle.legend.posY - 10)
            }
        }
    }

    public alignLabelPos(type: string) {
        let labelElem: any = document.querySelector(`#${this.selectedText}`)
        let chartW = this.width - this.margin.left - this.margin.right
        let chartH = this.height - this.margin.top - this.margin.bottom
        if (labelElem) {
            let bbox = labelElem.getBBox()
            let textW = bbox.width
            let textH = bbox.height

            if (this.selectedText === 'labely') {
                let pos: { [key: string]: number } = {
                    'left': 0,
                    'right': chartW,
                    'hcenter': chartW / 2,

                    'top': 0,
                    'bottom': -chartH,
                    'vcenter': -chartH / 2
                }
                let offset: { [key: string]: number } = {
                    'left': - textH - 30,
                    'right': textH,
                    'hcenter': 0,

                    'top': - textW,
                    'bottom': 0,
                    'vcenter': - textW / 2
                }
                if (type === 'left' || type === 'right' || type == 'hcenter') {
                    this.changeLabelPos(this.labelStyle[this.selectedText].posX, pos[type])
                    this.labelStyle[this.selectedText].offsetY = offset[type]
                } else if (type === 'top' || type === 'bottom' || type == 'vcenter') {
                    this.changeLabelPos(pos[type], this.labelStyle[this.selectedText].posY)
                    this.labelStyle[this.selectedText].offsetX = offset[type]
                }


            }
            else if (this.selectedText === 'legend') {
                let pos: { [key: string]: number } = {
                    'left': 0,
                    'right': chartW,
                    'hcenter': chartW / 2,

                    'top': 0,
                    'bottom': chartH,
                    'vcenter': chartH / 2
                }
                let offset: { [key: string]: number } = {
                    'left': 10,
                    'right': - textW - 5,
                    'hcenter': - textW / 2,

                    'top': 20,
                    'bottom': - textH,
                    'vcenter': - textH / 2
                }

                if (type === 'left' || type === 'right' || type == 'hcenter') {
                    this.changeLabelPos(pos[type], this.labelStyle[this.selectedText].posY)
                    this.labelStyle[this.selectedText].offsetX = offset[type]
                } else if (type === 'top' || type === 'bottom' || type == 'vcenter') {
                    this.changeLabelPos(this.labelStyle[this.selectedText].posX, pos[type])
                    this.labelStyle[this.selectedText].offsetY = offset[type]
                }
            }
            else {
                let pos: { [key: string]: number } = {
                    'left': 0,
                    'right': chartW,
                    'hcenter': chartW / 2,

                    'top': 0,
                    'bottom': chartH,
                    'vcenter': chartH / 2
                }
                let offset: { [key: string]: number } = {
                    'left': 5,
                    'right': - textW - 5,
                    'hcenter': - textW / 2,

                    'top': - textH,
                    'bottom': textH + 25,
                    'vcenter': textH / 2
                }
                if (type === 'left' || type === 'right' || type == 'hcenter') {
                    this.changeLabelPos(pos[type], this.labelStyle[this.selectedText].posY)
                    this.labelStyle[this.selectedText].offsetX = offset[type]
                } else if (type === 'top' || type === 'bottom' || type == 'vcenter') {
                    this.changeLabelPos(this.labelStyle[this.selectedText].posX, pos[type])
                    this.labelStyle[this.selectedText].offsetY = offset[type]
                }
            }
        }
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
                "vis": this.titleVis,
                "fontSize": this.labelStyle.title.size,
                "pos": this.labelStyle.title.posRatio,
                "offset": this.labelStyle.title.offset,
                "font": this.labelStyle.title.font,
                "bold": this.labelStyle.title.bold,
                "italic": this.labelStyle.title.italic
            },
            "axis": {
                "x": {
                    "label": {
                        "text": this.labelX,
                        "fontSize": this.labelStyle.labelx.size,
                        "pos": this.labelStyle.labelx.posRatio,
                        "offset": this.labelStyle.labelx.offset,
                        "font": this.labelStyle.labelx.font,
                        "bold": this.labelStyle.labelx.bold,
                        "italic": this.labelStyle.labelx.italic
                    },
                    "min": this.xAxisMin,
                    "max": this.xAxisMax,
                    "vis": this.labelxVis,
                    "sigDig": this.sigDigX,
                    "exp": this.expX,
                    "fontSize": this.labelStyle.axisx.size,
                    "inner": this.xTicksSize,
                    "font": this.labelStyle.axisx.font,
                    "bold": this.labelStyle.axisx.bold,
                    "italic": this.labelStyle.axisx.italic
                },
                "y": {
                    "label": {
                        "text": this.labelY,
                        "fontSize": this.labelStyle.labely.size,
                        "pos": this.labelStyle.labely.posRatio,
                        "offset": this.labelStyle.labely.offset,
                        "font": this.labelStyle.labely.font,
                        "bold": this.labelStyle.labely.bold,
                        "italic": this.labelStyle.labely.italic
                    },
                    "min": this.yAxisMin,
                    "max": this.yAxisMax,
                    "vis": this.labelyVis,
                    "sigDig": this.sigDigY,
                    "exp": this.expY,
                    "fontSize": this.labelStyle.axisy.size,
                    "inner": this.yTicksSize,
                    "font": this.labelStyle.axisy.font,
                    "bold": this.labelStyle.axisy.bold,
                    "italic": this.labelStyle.axisy.italic
                }
            },
            "style": {
                "frame": this.frameVis,
                "lineWeight": this.lineWeight,
                "dash": this.lineIsDash,
                "lineType": this.lineType,
                "margin": this.margin,
                "width": this.width,
                "height": this.height,
                "grid": this.gridVis,
            },
            "legend": {
                "vis": this.legendVis,
                "max": this.maxVis,
                "min": this.minVis,
                "pos": this.labelStyle.legend.posRatio,
                "offset": this.labelStyle.legend.offset,
                "fontSize": this.labelStyle.legend.size,
                "font": this.labelStyle.legend.font,
                "bold": this.labelStyle.legend.bold,
                "italic": this.labelStyle.legend.italic
            },
            "dataSet": buf1
        }

        return JSON.stringify(obj)
    }

    public setJSON(text: string) {
        const json = JSON.parse(text)
        this.firstDraw = false

        this.potentialMax = json.potential.max
        this.potentialMin = json.potential.min
        this.currentMax = json.current.max
        this.currentMin = json.current.min

        this.labelX = json.axis.x.label.text
        this.labelStyle.labelx.size = json.axis.x.label.fontSize
        this.labelStyle.labelx.posRatio = json.axis.x.label.pos
        this.labelStyle.labelx.offset = json.axis.x.label.offset
        this.labelStyle.labelx.font = json.axis.x.label.font
        this.labelStyle.labelx.bold = json.axis.x.label.bold
        this.labelStyle.labelx.italic = json.axis.x.label.italic

        this.labelxVis = json.axis.x.vis
        this.xAxisMax = json.axis.x.max
        this.xAxisMin = json.axis.x.min
        this.sigDigX = json.axis.x.sigDig
        this.expX = json.axis.x.exp
        this.labelStyle.axisx.size = json.axis.x.fontSize
        this.xTicksSize = json.axis.x.inner
        this.labelStyle.axisx.font = json.axis.x.font
        this.labelStyle.axisx.bold = json.axis.x.bold
        this.labelStyle.axisx.italic = json.axis.x.italic


        this.labelY = json.axis.y.label.text
        this.labelStyle.labely.size = json.axis.y.label.fontSize
        this.labelStyle.labely.posRatio = json.axis.y.label.pos
        this.labelStyle.labely.offset = json.axis.y.label.offset
        this.labelStyle.labely.font = json.axis.y.label.font
        this.labelStyle.labely.bold = json.axis.y.label.bold
        this.labelStyle.labely.italic = json.axis.y.label.italic


        this.labelyVis = json.axis.y.vis
        this.yAxisMax = json.axis.y.max
        this.yAxisMin = json.axis.y.min
        this.sigDigY = json.axis.y.sigDig
        this.expY = json.axis.y.exp
        this.labelStyle.axisy.size = json.axis.y.fontSize
        this.yTicksSize = json.axis.y.inner
        this.labelStyle.axisy.font = json.axis.y.font
        this.labelStyle.axisy.bold = json.axis.y.bold
        this.labelStyle.axisy.italic = json.axis.y.italic

        this.titleLabel = json.title.text
        this.titleVis = json.title.vis
        this.labelStyle.title.size = json.title.fontSize
        this.labelStyle.title.posRatio = json.title.pos
        this.labelStyle.title.offset = json.title.offset
        this.labelStyle.title.font = json.title.font
        this.labelStyle.title.bold = json.title.bold
        this.labelStyle.title.italic = json.title.italic

        this.frameVis = json.style.frame
        this.lineWeight = json.style.lineWeight
        this.lineIsDash = json.style.dash
        this.lineType = json.style.lineType
        this.margin = json.style.margin
        this.gridVis = json.style.grid

        this.width = json.style.width
        this.height = json.style.height

        this.legendVis = json.legend.vis
        this.maxVis = json.legend.max
        this.minVis = json.legend.min
        this.labelStyle.legend.posRatio = json.legend.pos
        this.labelStyle.legend.size = json.legend.fontSize
        this.labelStyle.legend.font = json.legend.font
        this.labelStyle.legend.bold = json.legend.bold
        this.labelStyle.legend.italic = json.legend.italic
        this.labelStyle.legend.offset = json.legend.offset

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

        // console.log(this.labelStyle)
    }
}



export class LabelStyle {
    public posRatio: { x: number, y: number } = { x: 0.01, y: 0.01 }
    public font: string = 'sans-serif'
    public italic: boolean = false
    public bold: boolean = false
    public size: number = 10

    private _width: number
    private _height: number

    public offset: { x: number, y: number } = { x: 0, y: 0 }

    constructor()
    constructor(w: number, h: number)
    constructor(w?: number, h?: number) {
        this._width = w != null ? w : 0
        this._height = h != null ? h : 0
    }

    public set height(h: number) {
        this._height = h
    }

    public set width(w: number) {
        this._width = w
    }

    public get posX() {
        // console.log(`${this.posRatio.x * this._width}  =${this.posRatio.x} * ${this._width}`)
        return this.posRatio.x * this._width
    }
    public get posY() {
        // console.log(`${this.posRatio.y * this._height}  =${this.posRatio.y} * ${this._height}`)
        return this.posRatio.y * this._height
    }

    public set posX(x: number) {
        this.posRatio.x = Math.round(x / this._width * 100) / 100

    }
    public set posY(y: number) {
        this.posRatio.y = Math.round(y / this._height * 100) / 100
    }

    public get offsetX() {
        return this.offset.x
    }
    public get offsetY() {
        return this.offset.y
    }
    public set offsetX(v: number) {
        this.offset.x = v
    }
    public set offsetY(v: number) {
        this.offset.y = v
    }
}