import chroma from 'chroma-js';
import * as d3 from 'd3';
import { select, svg } from 'd3';
import $ = require('jquery');
import { Data } from './Data';
import { DataSet } from './DataSet';
declare var require: any;

export class Chart {
    private width: number;
    private height: number;
    private margin: { [key: string]: number } = {
        'top': 50, 'bottom': 50, 'right': 50, 'left': 50
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

    private xAxisInner: boolean = false
    private yAxisInner: boolean = false

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
    private labelPos: { [key: string]: number[] } = {
        labelx: [10, 10], labely: [10, 10], title: [10, 10], legend: [20, 20]
    }
    private fontSize: { [key: string]: number } = {
        labelx: 10, labely: 10, title: 10, legend: 10, axisx: 10, axisy: 10
    }
    private fontBold: { [key: string]: boolean } = {
        labelx: false, labely: false, title: false, legend: false, axisx: false, axisy: false
    }
    private fontItalic: { [key: string]: boolean } = {
        labelx: false, labely: false, title: false, legend: false, axisx: false, axisy: false
    }
    private font: { [key: string]: string } = {
        labelx: 'sans-serif', labely: 'sans-serif', title: 'sans-serif', legend: 'sans-serif', axisx: 'sans-serif', axisy: 'sans-serif'
    }

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
        this.width = w;
        this.height = h;
        this.firstDraw = true
        this.draw();
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

            if (this.firstDraw) {
                // 縦軸の目盛りの文字の長さに応じてmarginを調整
                const text = this.expFormat(this.currentMax.toString(), this.expY, this.sigDigY)
                this.margin.left = 30 + text.length * this.fontSize.axisy * 0.75

                this.labelPos.title = [this.width / 2, 20]
                this.labelPos.labelx = [this.width / 2, this.height - 5]
                this.labelPos.labely = [-this.height / 2, 20]

                this.firstDraw = false
            }

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

            const xAxisOut = d3.axisBottom(xScale)
                .tickFormat(d3.format('e'))
                .tickValues(this.ticksX)
            const xAxisIn = d3.axisTop(xScale)
                .tickFormat(d3.format('e'))
                .tickValues(this.ticksX)

            const yAxisOut = d3.axisLeft(yScale)
                .tickFormat(d3.format('e'))
                .tickValues(this.ticksY)
            const yAxisIn = d3.axisRight(yScale)
                .tickFormat(d3.format('e'))
                .tickValues(this.ticksY)

            // add X axis
            svg.append("g")
                .attr('class', 'axis')
                .attr('id', 'x-axis')
                .attr("transform", `translate(${this.margin.left}, ${chartH + this.margin.top})`)
                .attr("font-size", `${this.fontSize.axisx}px`)
                .attr("font-weight", this.fontBold.axisx ? 'bold' : 'nomal')
                .attr("font-style", this.fontItalic.axisx ? 'italic' : 'nomal')
                .attr('font-family', this.font.axisx)
                .attr("cursor", "pointer")
                .call(this.xAxisInner ? xAxisIn : xAxisOut)
                .on('click', function (e) {
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
                .attr("font-size", `${this.fontSize.axisx}px`)
                .attr('font-family', this.font.axisx)
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
                .attr("font-weight", this.fontBold.axisy ? 'bold' : 'nomal')
                .attr("font-style", this.fontItalic.axisy ? 'italic' : 'nomal')
                .attr("cursor", "pointer")
                .call(this.yAxisInner ? yAxisIn : yAxisOut)
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
                .attr("font-size", `${this.fontSize.axisy}px`)
                .attr('font-family', this.font.axisy)
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
            let leX = this.labelPos.legend[0]
            let leY = this.labelPos.legend[1]
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
                            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                            .attr("stroke-dasharray", data.dash)
                            .attr("stroke-width", 2)
                            .attr("stroke", data.color)
                        legend.append('text')
                            .attr("x", leX + 35)
                            .attr("y", leY)
                            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                            .attr("font-size", `${this.fontSize.legend}px`)
                            .attr("font-weight", this.fontBold.legend ? 'bold' : 'nomal')
                            .attr("font-style", this.fontItalic.legend ? 'italic' : 'nomal')
                            .attr('font-family', this.font.legend)
                            .text(data.label)


                        if (this.maxVis) {
                            leY += (this.fontSize.legend * 1.2)
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
                                .attr('x', leX + 30)
                                .attr('y', leY)
                                .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                                .attr("font-size", `${this.fontSize.legend}px`)
                                .attr("font-weight", this.fontBold.legend ? 'bold' : 'nomal')
                                .attr("font-style", this.fontItalic.legend ? 'italic' : 'nomal')
                                .attr('font-family', this.font.legend)
                                .text(`max(${x}, ${y})`)


                        }
                        if (this.minVis) {
                            leY += (this.fontSize.legend * 1.2)
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
                                .attr('x', leX + 30)
                                .attr('y', leY)
                                .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
                                .attr("font-size", `${this.fontSize.legend}px`)
                                .attr("font-weight", this.fontBold.legend ? 'bold' : 'nomal')
                                .attr("font-style", this.fontItalic.legend ? 'italic' : 'nomal')
                                .attr('font-family', this.font.legend)
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
                svg.append('rect')
                    .attr('id', 'select-box-legend')
                    .attr('class', 'select-box')
                    .attr('width', 200)
                    .attr('height', leY - me.labelPos.legend[1])
                    .attr('fill', 'none')
                    .attr('stroke', '#4287f5')
                    .attr('display', 'none')
                    .attr("x", me.margin.left + me.labelPos.legend[0])
                    .attr("y", me.margin.top + me.labelPos.legend[1] - 10)
                // .attr("transform", `translate(${}, ${})`)
            }




            // X軸ラベルの描画
            if (this.labelxVis) {
                svg.append('text')
                    .attr("id", "labelx")
                    .attr("x", this.labelPos.labelx[0])
                    .attr("y", this.labelPos.labelx[1])
                    .attr("text-anchor", "bottom")
                    .attr("text-align", "center")
                    .attr("font-size", `${this.fontSize.labelx}px`)
                    .attr("font-family", this.font.labelx)
                    .attr("font-weight", this.fontBold.labelx ? 'bold' : 'nomal')
                    .attr("font-style", this.fontItalic.labelx ? 'italic' : 'nomal')
                    .text(this.labelX)
                    .attr("cursor", "pointer")
                    .on('click', function () {
                        if (me.selectedText != 'labelx') {
                            me.selectedText = 'labelx'
                        } else {
                            me.selectedText = 'none'
                        }
                        $('.select-box').hide()
                        $(`#select-box-${me.selectedText}`).show()
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
                        .attr("x", bbox.x - 2)
                        .attr("y", bbox.y - 2)
                    // .attr("transform", `translate(${bbox.x - 2}, ${bbox.x - 2})`)
                }
            }


            // Y軸ラベルの描画
            if (this.labelyVis) {
                svg.append('text')
                    .attr("id", "labely")
                    .attr("x", this.labelPos.labely[0])
                    .attr("y", this.labelPos.labely[1])
                    .attr("text-anchor", "top")
                    .attr("text-align", "center")
                    .attr("font-size", `${this.fontSize.labely}px`)
                    .attr("font-family", this.font.labely)
                    .attr("transform", "rotate(-90)")
                    .attr("font-weight", this.fontBold.labely ? 'bold' : 'nomal')
                    .attr("font-style", this.fontItalic.labely ? 'italic' : 'nomal')
                    .text(this.labelY)
                    .attr("cursor", "pointer")
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
                        .attr("x", this.labelPos.labely[0])
                        .attr("y", this.labelPos.labely[1] - bbox.height)
                        .attr("transform", "rotate(-90)")
                    // .attr("transform", `translate(${bbox.x - 2}, ${bbox.y - 2})`)
                }
            }

            // タイトルラベル
            if (this.titleVis) {
                svg.append("text")
                    .attr("id", "title")
                    .attr("x", this.labelPos.title[0])
                    .attr("y", this.labelPos.title[1])
                    .attr("font-size", `${this.fontSize.title}px`)
                    .attr("text-anchor", "top")
                    .attr("text-align", "center")
                    .attr("font-family", this.font.title)
                    .attr("font-weight", this.fontBold.title ? 'bold' : 'nomal')
                    .attr("font-style", this.fontItalic.title ? 'italic' : 'nomal')
                    .text(this.titleLabel)
                    .attr("cursor", "pointer")
                    .on('click', function () {
                        if (me.selectedText != 'title') {
                            me.selectedText = 'title'
                        } else {
                            me.selectedText = 'none'
                        }
                        $('.select-box').hide()
                        $(`#select-box-${me.selectedText}`).show()
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
                        .attr("x", bbox.x - 2)
                        .attr("y", bbox.y - 2)
                    // .attr("transform", `translate(${bbox.x - 2}, ${bbox.y - 2})`)
                }
            }


            $('.select-box').hide()
            $(`#select-box-${this.selectedText}`).show()
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


        $('#margin-top').val(this.margin.top)
        $('#margin-bottom').val(this.margin.bottom)
        $('#margin-left').val(this.margin.left)
        $('#margin-right').val(this.margin.right)


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

    public changeXAxisInner(flag: boolean) {
        this.xAxisInner = flag
        console.log(this.xAxisInner)
        this.draw()
    }
    public changeYAxisInner(flag: boolean) {
        this.yAxisInner = flag
        console.log(this.yAxisInner)
        this.draw()
    }


    public setFontStyleUI() {
        const me = this
        $('#font-style-bold-btn').prop('checked', this.fontBold[this.selectedText])
        $('#font-style-italic-btn').prop('checked', this.fontItalic[this.selectedText])
        $('#fontsize').val(this.fontSize[this.selectedText] ? this.fontSize[this.selectedText] : 10)
        $('#font-selector').find('input[type="radio"]').each(function () {
            if ($(this).val() == me.font[me.selectedText]) {
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

    public changeTicksStepX(val: number) {
        this.ticksStepX = val
        this.draw()
    }
    public changeTicksStepY(val: number) {
        this.ticksStepY = val
        this.draw()
    }

    public changeFontSize(val: number) {
        this.fontSize[this.selectedText] = val

        // 縦軸の目盛りの文字の長さに応じてmarginを調整
        const text = this.expFormat(this.currentMax.toString(), this.expY, this.sigDigY)
        this.margin.left = 30 + text.length * this.fontSize.axisy * 0.75
        this.draw()
    }
    public changeFontBold(flag: boolean) {
        this.fontBold[this.selectedText] = flag
        this.draw()
    }
    public changeFontItalic(flag: boolean) {
        this.fontItalic[this.selectedText] = flag
        this.draw()
    }
    public changeFont(font: string) {
        this.font[this.selectedText] = font
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


    public changeMargin(key: string, val: number) {
        this.margin[key] = val
        this.draw()
    }


    public legendMoveByMouse(mouseX: number, mouseY: number) {
        this.labelPos.legend[0] = mouseX - this.margin.left
        this.labelPos.legend[1] = mouseY - this.margin.top
        this.draw()
    }

    public addLabelPos(addX: number, addY: number) {
        if (this.selectedText != 'none') {
            if (this.selectedText === 'labely') {
                let x = this.labelPos[this.selectedText][0] - addY
                let y = this.labelPos[this.selectedText][1] + addX
                this.changeLabelPos(x, y)
            } else {
                let x = this.labelPos[this.selectedText][0] + addX
                let y = this.labelPos[this.selectedText][1] + addY
                this.changeLabelPos(x, y)
            }
        }
    }
    public changeLabelPos(x: number, y: number) {
        if (this.selectedText != 'none') {

            this.labelPos[this.selectedText][0] = x
            this.labelPos[this.selectedText][1] = y

            d3.select(`#${this.selectedText}`)
                .attr('x', this.labelPos[this.selectedText][0])
                .attr('y', this.labelPos[this.selectedText][1])

            if (this.selectedText != 'legend') {
                let labelElem: any = document.querySelector(`#${this.selectedText}`)
                if (labelElem) {
                    var bbox = labelElem.getBBox()
                    d3.select(`#select-box-${this.selectedText}`)
                        .attr('width', bbox.width + 4)
                        .attr('height', bbox.height + 4)
                        .attr("x", this.labelPos[this.selectedText][0] - 2)
                        .attr("y", this.labelPos[this.selectedText][1] - bbox.height)
                }
            } else {
                d3.select(`#select-box-${this.selectedText}`)
                    .attr("x", this.margin.left + this.labelPos.legend[0])
                    .attr("y", this.margin.top + this.labelPos.legend[1] - 10)
            }
            this.draw()
        }
    }

    public alignVerticalLabelPos(type: string) {
        let labelElem: any = document.querySelector(`#${this.selectedText}`)
        if (labelElem) {
            var bbox = labelElem.getBBox()
            let posx: { [key: string]: number } = {
                'left': 5,
                'right': this.width - bbox.width - 5,
                'center': this.width / 2 - bbox.width
            }
            if (this.selectedText === 'labely') {
                this.changeLabelPos(this.labelPos[this.selectedText][0], posx[type])
            } else {
                this.changeLabelPos(posx[type], this.labelPos[this.selectedText][1])
            }
        }
    }
    public alignHorizontalLabelPos(type: string) {
        let labelElem: any = document.querySelector(`#${this.selectedText}`)
        if (labelElem) {
            var bbox = labelElem.getBBox()
            let posy: { [key: string]: number } = {
                'top': 15,
                'bottom': this.height - bbox.height,
                'center': this.height / 2 - bbox.height
            }


            if (this.selectedText === 'labely') {
                this.changeLabelPos(posy[type], this.labelPos[this.selectedText][0])
            } else {
                this.changeLabelPos(this.labelPos[this.selectedText][0], posy[type])
            }
        }
    }
    public alignLabelPos(type: string) {
        let labelElem: any = document.querySelector(`#${this.selectedText}`)
        if (labelElem) {
            var bbox = labelElem.getBBox()
            if (this.selectedText === 'labely') {
                let pos: { [key: string]: number } = {
                    'left': 15,
                    'right': this.width - bbox.height + 10,
                    'hcenter': this.width / 2 - bbox.height + 10,
                    'top': -bbox.width - 10,
                    'bottom': -this.height + 10,
                    'vcenter': -(this.height / 2 + bbox.width / 2)
                }
                if (type === 'left' || type === 'right' || type == 'hcenter') {
                    this.changeLabelPos(this.labelPos[this.selectedText][0], pos[type])
                } else if (type === 'top' || type === 'bottom' || type == 'vcenter') {
                    this.changeLabelPos(pos[type], this.labelPos[this.selectedText][1])
                }

            } else {
                let pos: { [key: string]: number } = {
                    'left': 5,
                    'right': this.width - bbox.width - 5,
                    'hcenter': this.width / 2 - bbox.width,
                    'top': 15,
                    'bottom': this.height - bbox.height,
                    'vcenter': this.height / 2 - bbox.height
                }
                if (type === 'left' || type === 'right' || type == 'hcenter') {
                    this.changeLabelPos(pos[type], this.labelPos[this.selectedText][1])
                } else if (type === 'top' || type === 'bottom' || type == 'vcenter') {
                    this.changeLabelPos(this.labelPos[this.selectedText][0], pos[type])
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
                "fontSize": this.fontSize.title,
                "pos": this.labelPos.title
            },
            "axis": {
                "x": {
                    "label": {
                        "text": this.labelX,
                        "fontSize": this.fontSize.labelx,
                        "pos": this.labelPos.labelx
                    },
                    "min": this.xAxisMin,
                    "max": this.xAxisMax,
                    "vis": this.labelxVis,
                    "sigDig": this.sigDigX,
                    "exp": this.expX,
                    "fontSize": this.fontSize.axisx,
                },
                "y": {
                    "label": {
                        "text": this.labelY,
                        "fontSize": this.fontSize.labely,
                        "pos": this.labelPos.labely
                    },
                    "min": this.yAxisMin,
                    "max": this.yAxisMax,
                    "vis": this.labelyVis,
                    "sigDig": this.sigDigY,
                    "exp": this.expY,
                    "fontSize": this.fontSize.axisy
                }
            },
            "style": {
                "frame": this.frameVis,
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
                "pos": this.labelPos.legend,
                "fontSize": this.fontSize.legend
            },
            "dataSet": buf1
        }

        return JSON.stringify(obj)
    }

    public setJSON(text: string) {
        const json = JSON.parse(text)

        this.potentialMax = json.potential.max
        this.potentialMin = json.potential.min
        this.currentMax = json.current.max
        this.currentMin = json.current.min

        this.labelX = json.axis.x.label.text
        this.fontSize.labelx = json.axis.x.label.fontSize
        this.labelxVis = json.axis.x.vis
        this.xAxisMax = json.axis.x.max
        this.xAxisMin = json.axis.x.min
        this.sigDigX = json.axis.x.sigDig
        this.expX = json.axis.x.exp
        this.fontSize.axisx = json.axis.x.fontSize
        this.labelPos.axisx = json.axis.x.label.pos

        this.labelY = json.axis.y.label.text
        this.fontSize.labely = json.axis.y.label.fontSize
        this.labelyVis = json.axis.y.vis
        this.yAxisMax = json.axis.y.max
        this.yAxisMin = json.axis.y.min
        this.sigDigY = json.axis.y.sigDig
        this.expY = json.axis.y.exp
        this.fontSize.axisy = json.axis.y.fontSize
        this.labelPos.axisy = json.axis.y.label.pos

        this.titleLabel = json.title.text
        this.titleVis = json.title.vis
        this.fontSize.title = json.title.fontSize
        this.labelPos.title = json.title.pos

        this.frameVis = json.style.frame
        this.lineWeight = json.style.lineWeight
        this.lineIsDash = json.style.dash
        this.lineType = json.style.lineType
        this.margin = json.style.margin
        this.gridVis = json.style.grid

        this.legendVis = json.legend.vis
        this.maxVis = json.legend.max
        this.minVis = json.legend.min
        this.labelPos.legend = json.legend.pos
        this.fontSize.legend = json.legend.fontSize

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