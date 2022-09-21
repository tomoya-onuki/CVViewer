import $ = require('jquery');
import { Chart } from './Chart';
import { Data } from './Data';
import { ReadFiles } from './ReadFiles';
import { myUI } from './myUI';
declare var require: any;

// HTML特殊文字を使えるようにした
const domParser: DOMParser = new DOMParser();
const parseHTMLcode = (code: string): string => {
    return String(domParser.parseFromString(code, 'text/html').body.innerText)
}

let lang: string = ''

$(function () {
    const ui = new myUI()
    ui.toggleSwitch()
    ui.switchBtn()
    ui.fontSelector()
    ui.hideBtn()

    new Main().init()

    lang = String($('html').attr('lang'))

    $('#help-modal > .close').on('click', function () {
        $('#help-modal').hide()
    })
    $('#help-alert').on('click', function () {
        $('#help-modal').show()
    })
});

export class Main {
    private chart: Chart = new Chart();
    private outputName: string = 'figure'

    constructor() {
        // this.chart.init();
    }

    public init(): void {
        const me: Main = this;
        const fReader: ReadFiles = new ReadFiles();
        this.optimizeChartSize()

        // イベントリスナ
        // ファイルを選択
        $('#file-input')
            .on('change', function (e: any) {
                const files = e.target.files; // ファイルのリスト

                for (let i = 0; i < files.length; i++) {
                    // JSONの場合
                    if (files[i].name.indexOf('.json') != -1) {
                        let jsonFile = files[i]
                        fReader.readJSON(jsonFile)
                            .then((jsonStr: string) => {
                                me.setJson(jsonStr)
                                return
                            })
                    }
                }

                const header: string = String($('#file-format-header').val())
                let separator: string = String($('#file-format-separator-selctor > option:selected').val())
                if (separator === 'other') {
                    separator = String($('#file-format-separator-text').val())
                }
                const pCol: number = Number($('#file-format-first-col > option:selected').val())
                const match = String($('#file-format-header-match > option:selected').val())
                if (match === 'exact') separator = '^' + separator + '$'

                fReader.readTXT(files, header, separator, pCol)
                    .then((dataList: Data[]) => {
                        me.setData(dataList)

                        if ($('#ave-batch').prop('checked')) {
                            dataList.forEach(data => {
                                $(`#${data.label}`).prop('checked', true)
                            })
                            grouping()
                            me.changeUiPane($('#file-ui-select'), $('#file-ui'))
                        }
                    })
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

                for (let i = 0; i < files.length; i++) {
                    // JSONの場合
                    if (files[i].name.indexOf('.json') != -1) {
                        let jsonFile = files[i]
                        fReader.readJSON(jsonFile)
                            .then((jsonStr: string) => {
                                me.setJson(jsonStr)
                                return
                            })
                    }
                }

                const header: string = String($('#file-format-header').val())
                let separator: string = String($('#file-format-separator-selctor > option:selected').val())
                if (separator === 'other') {
                    separator = String($('#file-format-separator-text').val())
                }
                const pCol: number = Number($('#file-format-first-col > option:selected').val())

                fReader.readTXT(files, header, separator, pCol)
                    .then((dataList: Data[]) => {
                        me.setData(dataList)

                        if ($('#ave-batch').prop('checked')) {
                            console.log('batch ave')
                            dataList.forEach(data => {
                                $(`#${data.label}`).prop('checked', true)
                            })
                            grouping()
                            me.changeUiPane($('#file-ui-select'), $('#file-ui'))
                        }
                    })
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


        $('#file-format-separator-selctor').on('input', function () {
            const separator: string = String($(this).find('option:selected').val())
            if (separator === 'other') {
                $('#file-format-separator-text').show()
            } else {
                1
                $('#file-format-separator-text').hide()
            }
        })

        // タブ
        $('#file-ui-select').on('click', function () {
            me.changeUiPane($(this), $('#file-ui'));
        });
        $('#edit-ui-select').on('click', function () {
            me.changeUiPane($(this), $('#edit-ui'));
        });
        $('#data-ui-select').on('click', function () {
            me.changeUiPane($(this), $('#data-ui'));
        });
        $('#vis-ui-select').on('click', function () {
            me.changeUiPane($(this), $('#vis-ui'));
        });
        // $('#save-ui-select').on('click', function () {
        //     me.changeUiPane($(this), $('#save-ui'));
        // });

        // ファイルのグルーピング 
        $('#file-all-select').on('click', function () {
            $('.data-item').each(function () {
                if ($(this).is(':visible')) {
                    $(this).find('input[type="checkbox"]').prop('checked', true)
                }
            })
        })
        $('#file-all-clear').on('click', function () {
            $('.data-item').each(function () {
                if ($(this).is(':visible')) {
                    $(this).find('input[type="checkbox"]').prop('checked', false)
                }
            })
        })
        $('#data-search').on('input', function () {
            const query: string = String($(this).val()).toLowerCase()
            if (query != '') {
                $('.data-item').hide()
                $('.data-item').each(function () {
                    const fname: string = String($(this).find('label').text()).toLowerCase()
                    if (fname.indexOf(query) !== -1) {
                        $(this).show()
                    }
                })
            } else {
                $('.data-item').show()
            }
        })
        let groupNum = 0
        function grouping() {
            let selectedDataLabelList: string[] = []
            let groupKey = String($('#data-group-label').val())
            if (groupKey == '' || groupKey == undefined) {
                groupKey = `Group${groupNum}`
            }
            groupNum++;
            $('.data-item > input').each(function () {
                const isCheck: boolean = Boolean($(this).prop('checked'))
                if (isCheck) {
                    let label: string = String($(this).attr('id'))
                    selectedDataLabelList.push(label)
                }
            })
            const hasGroupLabel: boolean = me.chart.hasGroupLabel(groupKey)
            if (selectedDataLabelList.length > 0 && !hasGroupLabel) {
                // グルーピング
                me.chart.groupingData(selectedDataLabelList, groupKey)
                // 配色
                const type: string = String($('#line-type-selector').find('option:selected').val())
                const isDash: boolean = $('#dash-line-mode').prop('checked')
                me.chart.changeLineColorScheme(type)
                me.chart.changeLineDashed(isDash)

                $('#cover').hide()
                me.addGroupItems(groupKey)

            } else if (hasGroupLabel) {
                if (lang === 'ja')
                    alert(`${groupKey}はすでに存在しています`)
                else if (lang === 'en')
                    alert(`${groupKey} is already exist.`)
            } else {
                if (lang === 'ja')
                    alert('平均化が出来ませんでした. データが選択されていません.')
                else if (lang === 'en')
                    alert('Failed to average. Selected data were none.')
            }

            me.chart.draw()
        }
        $('#data-grouping-btn').on('click', function () {
            grouping()
        })


        $('#group-all-show').on('click', function () {
            me.chart.changeDataVisibleAll(true)
            $('.group-checkbox').prop('checked', true)
        })
        $('#group-all-hide').on('click', function () {
            me.chart.changeDataVisibleAll(false)
            $('.group-checkbox').prop('checked', false)
        })
        $('#group-reverse').on('click', function () {
            let $tmp: any[] = []
            $('.dataset-item').each(function () {
                $tmp.push($(this))
            })
            $('#dataset-list').empty()
            $tmp.forEach(element => {
                $('#dataset-list').prepend(element)
            })

            me.chart.reverseGroupKeyList()
            me.chart.draw()
        })

        $('#group-detail-modal-close').on('click', function () {
            $('#group-detail-modal').fadeOut()
        })

        // グラフの保存
        $('#save-fig-btn').on('click', function () {
            const type: string = String($('#fig-type > option:selected').val())
            me.saveFig(type);
        });

        $('#save-fig-name').on('change', () => {
            me.outputName = String($('#save-fig-name').val())
        })


        // 軸ラベルのセット
        $('#set-graph-label-x').on('input', function () {
            me.chart.setAxisLabelX(String($(this).val()))
            me.chart.draw()
        });
        $('#set-graph-label-y').on('input', function () {
            me.chart.setAxisLabelY(String($(this).val()))
            me.chart.draw()
        });
        $('#set-graph-title').on('input', function () {
            me.chart.setTitleLabel(String($(this).val()))
            me.chart.draw()
        });
        $('#labelx-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeLabelxVis(flag)
            me.chart.draw()
        })
        $('#labely-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeLabelyVis(flag)
            me.chart.draw()
        })
        $('#title-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeTitleVis(flag)
            me.chart.draw()
        })


        // グリッド
        $('#grid-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeGridVis(flag)
            me.chart.draw()
        })
        $('#frame-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeFrameVis(flag)
            me.chart.draw()
        })

        // ピークの表示
        $('#max-vis').on('input', function () {
            let flag: boolean = Boolean($(this).prop('checked'))
            if (flag) {
                $('#legend-vis').prop('checked', true)
                me.chart.changeLegendVis(true)
            }
            me.chart.changeMaxVis(flag)
            me.chart.draw()
        })
        $('#min-vis').on('input', function () {
            let flag: boolean = Boolean($(this).prop('checked'))
            if (flag) {
                $('#legend-vis').prop('checked', true)
                me.chart.changeLegendVis(true)
            }
            me.chart.changeMinVis(flag)
            me.chart.draw()
        })

        // 軸の範囲のセット
        $('#x-axis-min').on('input', function () {
            const unit: string = String($('#x-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                let val: number = Number($(this).val()) / 100
                me.chart.setXaxisMinRatio(val)
                me.chart.draw()
            } else {
                let val: number = Number($(this).val())
                if (val !== null) {
                    me.chart.setXaxisMin(val)
                    me.chart.draw()
                }
            }
        })
        $('#x-axis-max').on('input', function () {
            const unit: string = String($('#x-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                let val: number = Number($(this).val()) / 100
                me.chart.setXaxisMaxRatio(val)
                me.chart.draw()
            } else {
                let val: number = Number($(this).val())
                if (val !== null) {
                    me.chart.setXaxisMax(val)
                    me.chart.draw()
                }
            }
        })
        $('#x-axis-range-unit').on('input', function () {
            let val0 = Number($('#x-axis-min').val())
            let val1 = Number($('#x-axis-max').val())
            const unit: string = String($('#x-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                me.chart.setXaxisMinRatio(val0 / 100)
                me.chart.setXaxisMaxRatio(val1 / 100)
                me.chart.draw()
            } else {
                if (val0 !== null) me.chart.setXaxisMin(val0)
                if (val1 !== null) me.chart.setXaxisMax(val1)
                me.chart.draw()
            }
        })
        const SIprefix: { [key: string]: string } = {
            'e+1': 'de', 'e+2': 'h', 'e+3': 'k',
            'e+6': 'M', 'e+9': 'G', 'e+12': 'T',
            'e+15': 'P', 'e+18': 'E', 'e+21': 'Z',
            'e+24': 'Y', 'e+0': '',
            'e-1': 'd', 'e-2': 'c', 'e-3': 'm',
            'e-6': 'μ', 'e-9': 'n', 'e-12': 'p',
            'e-15': 'f', 'e-18': 'a', 'e-21': 'z',
            'e-24': 'y', 'e-0': ''
        }
        $('#x-axis-unit').on('input', function () {
            const unit: string = String($('#x-axis-unit').val())
            if (unit.match(/e[+-]\d+/g) != null) {
                const exp: number = parseInt(unit.replace('e', ''))
                me.chart.changeExponentX(exp)

                // ラベルの更新
                let prefix = SIprefix[unit] ? SIprefix[unit] : unit + ' '
                me.chart.setAxisLabelX(`Potential / ${prefix}V`)
                $('#set-graph-label-x').val(`Potenital / ${prefix}V`)
                me.chart.draw()
            } else {
                me.chart.changeExponentX(0)
                me.chart.setAxisLabelX(`Potential / V`)
                $('#set-graph-label-x').val(`Potenital / V`)
                me.chart.draw()
            }
            $('#x-ticks-unit').text(unit)
        })
        $('#x-sig-dig').on('input', function () {
            let val: number = Number($(this).val())
            if (val < 1) {
                val = 1
            }
            me.chart.changeSigDigX(val)
            me.chart.draw()
        })
        $('#x-ticks').on('input', function () {
            // let val: number = Number($(this).val())
            let val: number = Number(String($(this).val()) + String($('#x-axis-unit').val()))
            if (val > 0)
                me.chart.changeTicksStepX(val)
            me.chart.draw()
        })
        $('#x-axis-direction').on('input', function () {
            const type: string = String($(this).find('option:selected').val())
            me.chart.changeXTicksSize(type)
            me.chart.draw()
        })

        $('#y-axis-range-unit').on('input', function () {
            let val0 = Number($('#y-axis-min').val())
            let val1 = Number($('#y-axis-max').val())
            const unit: string = String($('#y-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                me.chart.setYaxisMinRatio(val0 / 100)
                me.chart.setYaxisMaxRatio(val1 / 100)
            } else {
                if (val0 !== null) me.chart.setYaxisMin(val0)
                if (val1 !== null) me.chart.setYaxisMax(val1)
            }
            me.chart.draw()
        })
        $('#y-axis-min').on('input', function () {
            const unit: string = String($('#y-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                let val: number = Number($(this).val()) / 100
                me.chart.setYaxisMinRatio(val)
                me.chart.draw()
            } else {
                let val: number = Number($(this).val())
                if (val !== null) {
                    me.chart.setYaxisMin(val)
                    me.chart.draw()
                }
            }
        })
        $('#y-axis-max').on('input', function () {
            const unit: string = String($('#y-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                let val: number = Number($(this).val()) / 100
                me.chart.setYaxisMaxRatio(val)
                me.chart.draw()
            } else {
                let val: number = Number($(this).val())
                if (val !== null) {
                    me.chart.setYaxisMax(val)
                    me.chart.draw()
                }
            }
        })
        $('#y-axis-unit').on('input', function () {
            const unit: string = String($('#y-axis-unit').val())
            if (unit.match(/e[+-]\d+/g) != null) {
                const exp: number = parseInt(unit.replace('e', ''))
                me.chart.changeExponentY(exp)

                // ラベルの更新
                let prefix = SIprefix[unit] ? SIprefix[unit] : unit + ' '
                $('#set-graph-label-y').val(`Current / ${prefix}A`)
                me.chart.setAxisLabelY(`Current / ${prefix}A`)
            } else {
                me.chart.changeExponentY(0)
                $('#set-graph-label-y').val(`Current / A`)
                me.chart.setAxisLabelY(`Current / A`)
            }

            me.chart.draw()
            $('#y-ticks-unit').text(unit)
        })
        $('#y-sig-dig').on('input', function () {
            let val: number = Number($(this).val())
            if (val < 1) {
                val = 1
            }
            me.chart.changeSigDigY(val)
            me.chart.draw()
        })
        $('#y-ticks').on('input', function () {
            let val: number = Number(String($(this).val()) + String($('#y-axis-unit').val()))
            if (val > 0)
                me.chart.changeTicksStepY(val)
            me.chart.draw()
        })
        $('#y-axis-direction').on('input', function () {
            const type: string = String($(this).find('option:selected').val())
            me.chart.changeYTicksSize(type)
            me.chart.draw()
        })

        $('#svg-width').on('change', function () {
            let width = Number($('#svg-width').val())
            let height = Number($('#svg-height').val())
            let w = Number($('#right-box').width())
            if (w < width) {
                width = w
                $('#svg-width').val(w)
            }
            me.chart.resize(width, height)
            me.chart.draw()
        })
        $('#svg-height').on('change', function () {
            let width = Number($('#svg-width').val())
            let height = Number($('#svg-height').val())
            let h = Number($('#right-box').height())
            if (h < height) {
                height = h
                $('#svg-height').val(h)
            }
            me.chart.resize(width, height)
            me.chart.draw()
        })

        $('#svg-size-optimize-btn').on('click', function () {
            me.optimizeChartSize()
            me.chart.draw()
        })

        // テーブルを閉じる
        $('#data-modal > .close').on('click', function () {
            $('#data-modal').fadeOut()
        })


        // 線のスタイル
        $('#line-type-selector').on('input', function () {
            const type: string = String($('#line-type-selector').find('option:selected').val())
            const isDash: boolean = $('#dash-line-mode').prop('checked')
            me.chart.changeLineColorScheme(type)
            me.chart.changeLineDashed(isDash)
            me.chart.draw()
        })
        let flag: number = 1
        $('#line-type-reverse').on('click', function () {
            const type: string = String($('#line-type-selector').find('option:selected').val())
            const isDash: boolean = $('#dash-line-mode').prop('checked')
            flag *= -1
            if (flag === -1) me.chart.reverseGroupKeyList()
            me.chart.changeLineColorScheme(type)
            if (flag === -1) me.chart.reverseGroupKeyList()
            me.chart.changeLineDashed(isDash)
            me.chart.draw()
        })
        $('#dash-line-mode').on('input', function () {
            const isDash: boolean = $('#dash-line-mode').prop('checked')
            me.chart.changeLineDashed(isDash)
            me.chart.draw()
        })


        $('#line-weight').on('input', function () {
            const val: number = Number($(this).val())
            me.chart.changeLineWeight(val)
            me.chart.draw()
        })

        // フォントスタイル
        $('#font-selector').on('input', function () {
            const font: string = String($(this).find('input[type="radio"]:checked').val())
            me.chart.changeFont(font)
            me.chart.draw()
        })
        $('#fontsize').on('input', function () {
            const val: number = Number($(this).val())
            me.chart.changeFontSize(val)
            me.chart.draw()
        })
        $('#font-style-bold-btn').on('click', function () {
            const flag = Boolean($(this).prop('checked'))
            me.chart.changeFontBold(flag)
            me.chart.draw()
        })
        $('#font-style-italic-btn').on('click', function () {
            const flag = Boolean($(this).prop('checked'))
            me.chart.changeFontItalic(flag)
            me.chart.draw()
        })

        $('#legend-vis').on('input', function () {
            let flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeLegendVis(flag)
            if (!flag) {
                $('#max-vis').prop('checked', false)
                me.chart.changeMaxVis(false)
                $('#min-vis').prop('checked', false)
                me.chart.changeMinVis(false)
            }
            me.chart.draw()
        })


        $('#align-bottom-btn').on('click', function () {
            me.chart.alignLabelPos('bottom')
            me.chart.draw()
        })
        $('#align-top-btn').on('click', function () {
            me.chart.alignLabelPos('top')
            me.chart.draw()
        })
        $('#align-vertival-center-btn').on('click', function () {
            me.chart.alignLabelPos('vcenter')
            me.chart.draw()
        })
        $('#align-left-btn').on('click', function () {
            me.chart.alignLabelPos('left')
            me.chart.draw()
        })
        $('#align-right-btn').on('click', function () {
            me.chart.alignLabelPos('right')
            me.chart.draw()
        })
        $('#align-horizon-center-btn').on('click', function () {
            me.chart.alignLabelPos('hcenter')
            me.chart.draw()
        })


        $('#margin-top').on('input', function () {
            const val: number = Number($(this).val())
            me.chart.changeMargin('top', val)
            me.chart.draw()
        })
        $('#margin-bottom').on('input', function () {
            const val: number = Number($(this).val())
            me.chart.changeMargin('bottom', val)
            me.chart.draw()
        })
        $('#margin-left').on('input', function () {
            const val: number = Number($(this).val())
            me.chart.changeMargin('left', val)
            me.chart.draw()
        })
        $('#margin-right').on('input', function () {
            const val: number = Number($(this).val())
            me.chart.changeMargin('right', val)
            me.chart.draw()
        })



        let viewMouseDown: boolean = false
        let preMousePos: number[] = []
        $('#view')
            .on('mousedown', function (e) {
                viewMouseDown = true
                var rect = $(this)[0].getBoundingClientRect();
                preMousePos[0] = e.clientX - rect.left
                preMousePos[1] = e.clientY - rect.top

                // $(this).css('cursor', 'grab')
            })
            .on('mousemove', function (e) {
                if (viewMouseDown) {
                    var rect = $(this)[0].getBoundingClientRect();
                    let mouseX = e.clientX - rect.left
                    let mosueY = e.clientY - rect.top
                    let diffX = mouseX - preMousePos[0]
                    let diffY = mosueY - preMousePos[1]

                    me.chart.addLabelPos(diffX, diffY)
                    me.chart.draw()

                    preMousePos[0] = mouseX
                    preMousePos[1] = mosueY
                }
            })
            .on('mouseup', function () {
                viewMouseDown = false

                $(this).css('cursor', 'auto')
            })


        let uiKey: string[] = ['file', 'data', 'vis', 'edit']
        let uiKeyCount: number = 0
        $(window)
            .resize(function () {
                let w = Number($('#right-box').width())
                let h = Number($('#right-box').height())
                let svgW: number = Number($('#svg-width').val())
                let svgH: number = Number($('#svg-height').val())
                if (svgW > w || svgH > h) {
                    me.optimizeChartSize()
                    me.chart.draw()
                }
            })
            .on('keydown', function (e) {
                // テンキー
                if (!e.altKey && !e.shiftKey) {
                    switch (e.keyCode) {
                        case 37: // ←
                            me.chart.addLabelPos(-5, 0)
                            break;
                        case 38: // ↑
                            me.chart.addLabelPos(0, -5)
                            break;
                        case 39: // →
                            me.chart.addLabelPos(5, 0)
                            break;
                        case 40: // ↓
                            me.chart.addLabelPos(0, 5)
                            break;
                    }
                }

                // console.log(e.keyCode)

                // ショートカット
                if (e.altKey) {
                    switch (e.keyCode) {
                        // サイズ調整
                        case 186: // 拡大 +
                            var w = Number($('#svg-width').val()) + 10
                            var h = Number($('#svg-height').val()) + 10
                            var maxW = Number($('#right-box').width())
                            var maxH = Number($('#right-box').height())
                            if (maxW < w) w = maxW
                            if (maxH < h) h = maxH
                            $('#svg-width').val(w)
                            $('#svg-height').val(h)
                            me.chart.resize(w, h)
                            break
                        case 189: // 縮小
                            var w = Number($('#svg-width').val()) - 10
                            var h = Number($('#svg-height').val()) - 10
                            $('#svg-width').val(w)
                            $('#svg-height').val(h)
                            me.chart.resize(w, h)
                            break
                        case 48: // サイズの最適化
                            me.optimizeChartSize()
                            break

                        case 79: // ファイルオープン
                            $('#file-input').click()
                            break

                        // タブ移動
                        case 49: // 1
                            me.changeUiPane($('#file-ui-select'), $('#file-ui'))
                            break
                        case 50: // 2
                            me.changeUiPane($('#data-ui-select'), $('#data-ui'))
                            break
                        case 51: // 3
                            me.changeUiPane($('#vis-ui-select'), $('#vis-ui'))
                            break
                        case 52: // 4
                            me.changeUiPane($('#edit-ui-select'), $('#edit-ui'))
                            break

                        case 39: // →
                            uiKeyCount++
                            if (uiKeyCount >= uiKey.length) uiKeyCount = 0
                            me.changeUiPane($(`#${uiKey[uiKeyCount]}-ui-select`), $(`#${uiKey[uiKeyCount]}-ui`))
                            break
                        case 37: // ←
                            uiKeyCount--
                            if (uiKeyCount < 0) uiKeyCount = uiKey.length - 1
                            me.changeUiPane($(`#${uiKey[uiKeyCount]}-ui-select`), $(`#${uiKey[uiKeyCount]}-ui`))
                            break


                        case 71: // g 
                            var flag = $('#grid-vis').prop('checked') ? false : true
                            $('#grid-vis').prop('checked', flag)
                            me.chart.changeGridVis(flag)
                            break;
                        case 77: // m
                            var flag = $('#max-vis').prop('checked') ? false : true
                            $('#max-vis').prop('checked', flag)
                            me.chart.changeMaxVis(flag)
                            break;
                        case 78: // n 
                            var flag = $('#min-vis').prop('checked') ? false : true
                            $('#min-vis').prop('checked', flag)
                            me.chart.changeMinVis(flag)
                            break;
                        case 70: // f 
                            var flag = $('#frame-vis').prop('checked') ? false : true
                            $('#frame-vis').prop('checked', flag)
                            me.chart.changeFrameVis(flag)
                            break;
                        case 76: // l 
                            var flag = $('#legend-vis').prop('checked') ? false : true
                            $('#legend-vis').prop('checked', flag)
                            me.chart.changeLegendVis(flag)
                            break;
                    }

                    // PNG保存
                    if (e.keyCode === 83) {
                        if (e.shiftKey) {
                            me.saveFigbyPNG()
                        } else {
                            me.saveFigByJson()
                        }
                    }
                }
                me.chart.draw()
            })
    }

    private optimizeChartSize() {
        let w = Math.round(Number($('#right-box').width()) * 0.95)
        let h = Math.round(Number($('#right-box').height()) * 0.95)
        if (w < h) h = w
        $('#svg-width').val(w)
        $('#svg-height').val(h)
        this.chart.resize(w, h)
    }

    private changeUiPane(selectorElem: any, uiElem: any) {
        $('.ui-parts').hide();
        uiElem.show();

        $('.view-selector').css({
            'border': 'none',
            'border-bottom': '#888 1px solid',
        });
        selectorElem.css({
            'border': '#888 1px solid',
            'border-bottom': 'none'
        });
    }

    private setData(dataList: Data[]): void {
        const me: Main = this
        dataList.forEach((data: Data) => {
            // そのデータラベルを持っているかのチェック
            // 持っていないとき = 新規
            if (!this.chart.includesData(data.label)) {

                me.chart.entry(data)
                
                me.changeUiPane($('#data-ui-select'), $('#data-ui'))
                this.addDataItems(data)
            }
            // データラベルが既に存在するとき、
            else {
                if (lang === 'ja')
                    alert(`${data.label}.csv は既に読み込んだファイルと、ファイル名が重複しています。ファイル名を変更して再度読み込んでください。`)
                else if (lang === 'en')
                    alert(`${data.label}.csv is already read.`)
            }
        });

    }

    private setJson(jsonStr: string) {
        $('#data-list').empty()
        $('#dataset-list').empty()
        $('#cover').hide()

        this.chart.setJSON(jsonStr)
        let dataList: { [key: string]: Data } = this.chart.getDataList()
        for (let key in dataList) {
            this.addDataItems(dataList[key])
        }
        this.chart.getGroupKeyList().forEach(key => {
            this.addGroupItems(key)
        })
        this.chart.setUI()
        this.changeUiPane($('#vis-ui-select'), $('#vis-ui'))
    }

    private addDataItems(data: Data) {
        const me = this
        // データリストの追加
        const $checkbox = $('<input>')
            .attr('type', 'checkbox')
            .attr('id', data.label)
        const $label = $('<label></label>')
            .attr('for', data.label)
            .text(data.label.replace('-', '.'))
        const $delete = $('<button></button>')
            .text('delete')
            .attr('id', `${data.label}-delete`)
            .addClass('item-btn')
        const $show = $('<button></button>')
            .text('show')
            .attr('id', `${data.label}-show`)
            .addClass('item-btn')
        const $item = $('<div></div>')
            .addClass('data-item')
            .append($checkbox, $label, $show, $delete)
        $('#data-list').append($item)

        // イベントリスナーの登録
        $delete.on('click', function () {
            if (lang === 'ja') {
                if (confirm('ファイルを削除します')) {
                    me.chart.removeData(data.label)
                    $item.remove()
                }
            } else if (lang === 'en') {
                if (confirm('delete file.')) {
                    me.chart.removeData(data.label)
                    $item.remove()
                }
            }
        })
        $show.on('click', function () {
            $('#data-modal table').remove()
            const list: any[] = me.chart.getData(data.label).values
            const $thead = $('<thead></thead>')
            let $row = $('<tr></tr>')
            let $col0 = $('<th></th>').text('potential')
            let $col1 = $('<th></th>').text('current')
            $row.append($col0, $col1)
            $thead.append($row)

            const $tbody = $('<tbody></tbody>')
            list.forEach(val => {
                let $row = $('<tr></tr>')
                let $col0 = $('<th></th>').text(val.potential)
                let $col1 = $('<th></th>').text(val.current)
                $row.append($col0, $col1)
                $tbody.append($row)
            })
            const $tabel = $('<table></table>')
                .append($thead, $tbody)
            $('#data-modal').append($tabel)
            $('#data-modal-label').text(data.label.replace('-', '.'))

            $('#data-modal').fadeIn()
        })
    }
    private addGroupItems(groupKey: string) {
        const me = this
        // UI DOMを登録
        const $checkbox = $('<input>')
            .attr('type', 'checkbox')
            .attr('id', `${groupKey}-check`)
            .addClass('group-checkbox')
            .prop('checked', true)
        const $text = $('<input>')
            .val(groupKey)
            .attr('type', 'text')
            .attr('placeholder', 'Group Label')
        const $color = $('<input>')
            .attr('type', 'color')
            .attr('id', `${groupKey}-color`)
        const $delete = $('<button></button>')
            .text('del')
            .attr('id', `${groupKey}-delete`)
            .addClass('item-btn')
        const $detailBtn = $('<input>')
            .attr('type', 'checkbox')
            .attr('id', `${groupKey}-detail-btn`)
            .addClass('group-detail-show')
        const $detailBtnLabel = $('<label></label>')
            .attr('for', `${groupKey}-detail-btn`)
            .text(parseHTMLcode('&#9660;'))
            .addClass('group-detail-show-label')
        const $detail = $('<div></div>')
            .addClass('group-detail')
        const $downBtn = $('<button></button>')
            .text(parseHTMLcode('&darr;'))
            .addClass('item-btn')
        const $upBtn = $('<button></button>')
            .text(parseHTMLcode('&uarr;'))
            .addClass('item-btn')

        const $div0 = $('<div></div>')
            .addClass('col0')
            .append($color, $text, $checkbox, $delete, $detailBtn, $downBtn, $upBtn, $detailBtnLabel)
        const $item = $('<div></div>')
            .addClass('dataset-item')
            .attr('name', groupKey)
            .append($div0, $detail)
        $('#dataset-list').append($item)

        $('<span></span>')
            .text('- ' + groupKey)
            .addClass('group-item')
            .appendTo($('#group-list'))

        $('.data-item > input').each(function () {
            $(this).prop('checked', false)
        })

        $text.on('change', function () {
            const newLabel: string = String($(this).val())
            me.chart.changeGroupLabel(groupKey, newLabel)
            me.chart.draw()
        })
        $checkbox.on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeDataVisible(groupKey, flag)
            me.chart.draw()
        })
        $color.on('input', function () {
            const color: string = String($(this).val())
            me.chart.changeDataColor(groupKey, color)
            me.chart.draw()
        })
        $delete.on('click', function () {
            if (lang === 'ja') {
                if (confirm('削除します')) {
                    $item.remove()
                    me.chart.removeGroup(groupKey)
                    me.chart.draw()
                }
            } else if (lang === 'en') {
                if (confirm('Delete')) {
                    $item.remove()
                    me.chart.removeGroup(groupKey)
                    me.chart.draw()
                }
            }
        })
        $downBtn.on('click', function () {
            let myIdx: number = 0
            $('.dataset-item').each(function (i) {
                if (String($(this).attr('name')) === groupKey) {
                    myIdx = i
                }
            })
            if (myIdx < $('.dataset-item').length - 1) {
                let nextIdx: number = myIdx + 1
                $('.dataset-item').eq(nextIdx).after($('.dataset-item').eq(myIdx))
            }

            let keyList: string[] = []
            $('.dataset-item').each(function (i) {
                let key: string = String($(this).find('input[type="text"]').val())
                keyList.push(key)
            })
            me.chart.sortGroupKeyList(keyList)
            me.chart.draw()
        })
        $upBtn.on('click', function () {
            let myIdx: number = 0
            $('.dataset-item').each(function (i) {
                if (String($(this).attr('name')) === groupKey) {
                    myIdx = i
                }
            })
            if (myIdx > 0) {
                let preIdx: number = myIdx - 1
                $('.dataset-item').eq(preIdx).before($('.dataset-item').eq(myIdx))
            }

            let keyList: string[] = []
            $('.dataset-item').each(function (i) {
                let key: string = String($(this).find('input[type="text"]').val())
                keyList.push(key)
            })
            me.chart.sortGroupKeyList(keyList)
            me.chart.draw()
        })
        $detailBtn.on('input', function () {
            const isShow: boolean = Boolean($detailBtn.prop('checked'))
            if (isShow) {
                let dataLabelList: string[] = me.chart.getGroup(groupKey).dataLabelList()
                $detail.empty()
                dataLabelList.forEach(flabel => {
                    const $gdelete = $('<button></button>')
                        .text('del')
                        .addClass('item-btn')
                    const $gtext = $('<div></div>')
                        .text(flabel.replace('-', '.'))
                        .addClass('label')
                    const $gitem = $('<div></div>')
                        .addClass('group-detail-item')
                        .append($gtext, $gdelete)

                    $detail.append($gitem)

                    $gdelete.on('click', function () {
                        if (lang === 'ja') {
                            if (confirm(`${groupKey}から${flabel}を削除します`)) {
                                me.chart.removeDataFromGroup(groupKey, flabel)
                                $gitem.remove()
                            }
                        } else if (lang === 'en') {
                            if (confirm(`Delete ${flabel} from ${groupKey}`)) {
                                me.chart.removeDataFromGroup(groupKey, flabel)
                                $gitem.remove()
                            }
                        }
                    })
                })

                $detailBtnLabel.text(parseHTMLcode('&#9650;'))
                $detail.show()
            } else {
                $detailBtnLabel.text(parseHTMLcode('&#9660;'))
                $detail.hide()
            }
            me.chart.draw()
            // $detail.fadeIn()
            // $('#group-detail-modal').fadeIn()
        })
    }


    private saveFig(type: string): void {
        if ($('#fig').length === 0) {
            if (lang === 'ja') {
                alert('グラフがありません')
            } else if (lang === 'en') {
                alert('Chart is nothing.')
            }
            return
        } else {
            $('.select-box').hide()

            if (type === 'png') {
                this.saveFigbyPNG()
            } else if (type === 'json') {
                this.saveFigByJson()
            } else if (type === 'csv') {
                this.saveFigByCsv()
            } else if (type === 'all') {
                this.saveFigbyPNG()
                this.saveFigByJson()
            }
        }
    }


    private saveFigbyPNG(): void {

        const input: any = document.querySelector('#fig');
        const svgData = new XMLSerializer().serializeToString(input);
        const svgDataBase64 = btoa(unescape(encodeURIComponent(svgData)))
        const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${svgDataBase64}`;

        const image = new Image();
        const resolution: number = Number($('#fig-resolution').find('option:selected').val())
        image.addEventListener('load', () => {
            const canvas = document.createElement('canvas');
            const width: number = input.getAttribute('width') * devicePixelRatio * resolution;
            const height: number = input.getAttribute('height') * devicePixelRatio * resolution;

            canvas.setAttribute('width', String(width));
            canvas.setAttribute('height', String(height));

            const context = <CanvasRenderingContext2D>canvas.getContext('2d')
            context.drawImage(image, 0, 0, width, height);

            canvas.toBlob((blob: any) => {
                const url: any = URL.createObjectURL(blob);
                let outname = this.outputName + '.png'
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

    private saveFigByJson() {
        const json: string = this.chart.getJSON()
        let ary = json.split('')
        let blob = new Blob(ary, { type: "text/json" })
        $('<a>', {
            href: URL.createObjectURL(blob),
            download: this.outputName + '.cvv.json'
        })[0].click()
    }

    private saveFigByCsv() {
        const list = this.chart.getCsvList()
        list.forEach(val => {
            let ary = val.csv.split('')
            let blob = new Blob(ary, { type: "text/csv" })
            $('<a>', {
                href: URL.createObjectURL(blob),
                download: this.outputName + '_' + val.fname + '.csv'
            })[0].click()
        })
    }
}