import $ = require('jquery');
import { Chart } from './Chart';
import { Data } from './Data';
import { ReadFiles } from './ReadFiles';
import { myUI } from './myUI';
import { DataSet } from './DataSet';
declare var require: any;

// HTML特殊文字を使えるようにした
const domParser: DOMParser = new DOMParser();
const parseHTMLcode = (code: string): string => {
    return String(domParser.parseFromString(code, 'text/html').body.innerText)
}

$(function () {
    new myUI().toggle()
    new Main().init()


    $('#help-modal > .close').on('click', function(){
        $('#help-modal').hide()
    })
    $('#help-alert').on('click', function() {
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
                let txtFiles = []
                let jsonFiles = []
                for (let i = 0; i < files.length; i++) {
                    if (files[i].name.indexOf('.txt') != -1) {
                        txtFiles.push(files[i])
                    } else if (files[i].name.indexOf('.json') != -1) {
                        jsonFiles.push(files[i])
                    }
                }
                fReader.readTXT(txtFiles)
                    .then((dataList: Data[]) => me.setData(dataList))

                if (jsonFiles.length > 1) {
                    alert('Only one JSON file can be read.')
                }
                fReader.readJSON(jsonFiles)
                    .then((jsonStr: string) => me.setJson(jsonStr))
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
                let txtFiles = []

                for (let i = 0; i < files.length; i++) {
                    if (files[i].name.indexOf('.txt') != -1) {
                        txtFiles.push(files[i])
                    } else if (files[i].name.indexOf('.json') != -1) {
                        let jsonFile = files[i]
                        fReader.readJSON(jsonFile)
                            .then((jsonStr: string) => me.setJson(jsonStr))
                    }
                }
                fReader.readTXT(txtFiles)
                    .then((dataList: Data[]) => me.setData(dataList))


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
        $('#data-grouping-btn').on('click', function () {
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
                me.chart.changeLineType(type, isDash)

                me.addGroupItems(groupKey)
            } else if (hasGroupLabel) {
                alert(`${groupKey} is already exist.`)
            } else {
                alert('Failed to average. Selected data were none.')
            }
        })


        $('#group-all-show').on('click', function () {
            me.chart.changeDataVisibleAll(true)
            $('.group-checkbox').prop('checked', true)
        })
        $('#group-all-hide').on('click', function () {
            me.chart.changeDataVisibleAll(false)
            $('.group-checkbox').prop('checked', false)
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
            me.chart.setAxisLabelX(String($(this).val()));
        });
        $('#set-graph-label-y').on('input', function () {
            me.chart.setAxisLabelY(String($(this).val()));
        });
        $('#set-graph-title').on('input', function () {
            me.chart.setTitleLabel(String($(this).val()));
        });
        $('#labelx-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeLabelxVis(flag)
        })
        $('#labely-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeLabelyVis(flag)
        })
        $('#title-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeTitleVis(flag)
        })


        // グリッド
        $('#grid-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeGridVis(flag)
        })
        $('#frame-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeFrameVis(flag)
        })

        // ピークの表示
        $('#max-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeMaxVis(flag)
        })
        $('#min-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeMinVis(flag)
        })

        // 軸の範囲のセット
        $('#x-axis-min').on('input', function () {
            const unit: string = String($('#x-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                let val: number = Number($(this).val()) / 100
                me.chart.setXaxisMinRatio(val)
            } else {
                let val: number = Number($(this).val())
                if (val !== null) me.chart.setXaxisMin(val)
            }
        })
        $('#x-axis-max').on('input', function () {
            const unit: string = String($('#x-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                let val: number = Number($(this).val()) / 100
                me.chart.setXaxisMaxRatio(val)
            } else {
                let val: number = Number($(this).val())
                if (val !== null) me.chart.setXaxisMax(val)
            }
        })
        $('#x-axis-range-unit').on('input', function () {
            let val0 = Number($('#x-axis-min').val())
            let val1 = Number($('#x-axis-max').val())
            const unit: string = String($('#x-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                me.chart.setXaxisMinRatio(val0 / 100)
                me.chart.setXaxisMaxRatio(val1 / 100)
            } else {
                if (val0 !== null) me.chart.setXaxisMin(val0)
                if (val1 !== null) me.chart.setXaxisMax(val1)
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
            } else {
                me.chart.changeExponentX(0)
                me.chart.setAxisLabelX(`Potential / V`)
                $('#set-graph-label-x').val(`Potenital / V`)
            }
        })
        $('#x-sig-dig').on('input', function () {
            let val: number = Number($(this).val())
            if (val < 1) {
                val = 1
                $(this).val(val)
            }
            me.chart.changeSigDigX(val)
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
        })
        $('#y-axis-min').on('input', function () {
            const unit: string = String($('#y-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                let val: number = Number($(this).val()) / 100
                me.chart.setYaxisMinRatio(val)
            } else {
                let val: number = Number($(this).val())
                if (val !== null) {
                    me.chart.setYaxisMin(val)
                }
            }
        })
        $('#y-axis-max').on('input', function () {
            const unit: string = String($('#y-axis-range-unit').find('option:selected').val())
            if (unit === 'ratio') {
                let val: number = Number($(this).val()) / 100
                me.chart.setYaxisMaxRatio(val)
            } else {
                let val: number = Number($(this).val())
                if (val !== null) {
                    me.chart.setYaxisMax(val)
                }
            }
        })
        $('#y-axis-unit').on('input', function () {
            const unit: number = Number($('#y-axis-unit').find('option:selected').val())
            me.chart.changeExponentY(unit)

            // ラベルの更新
            const str: string = 'e-' + String(unit * -1)
            let prefix = SIprefix[str] ? SIprefix[str] : str + ' '
            $('#set-graph-label-y').val(`Current / ${prefix}A`)
            me.chart.setAxisLabelY(`Current / ${prefix}A`)
        })
        $('#y-sig-dig').on('input', function () {
            let val: number = Number($(this).val())
            if (val < 1) {
                val = 1
                $(this).val(val)
            }
            me.chart.changeSigDigY(val)
        })

        $('#svg-width').on('input', function () {
            const width = Number($('#svg-width').val())
            const height = Number($('#svg-height').val())
            me.chart.resize(width, height)
        })
        $('#svg-height').on('input', function () {
            const width = Number($('#svg-width').val())
            const height = Number($('#svg-height').val())
            me.chart.resize(width, height)
        })

        $('#svg-size-optimize-btn').on('click', function () {
            me.optimizeChartSize()
        })

        // テーブルを閉じる
        $('#data-modal .close').on('click', function () {
            $('#data-modal').fadeOut()
        })


        // 線のスタイル
        $('#line-type-selector').on('input', function () {
            const type: string = String($('#line-type-selector').find('option:selected').val())
            const isDash: boolean = $('#dash-line-mode').prop('checked')
            me.chart.changeLineType(type, isDash)
        })
        $('#dash-line-mode').on('input', function () {
            const type: string = String($('#line-type-selector').find('option:selected').val())
            const isDash: boolean = $('#dash-line-mode').prop('checked')
            console.log(type)
            me.chart.changeLineType(type, isDash)
        })

        $('#line-weight-slider').on('input', function () {
            const val: number = Number($(this).val())
            $(this).prev().text(`Line Weight : ${val.toFixed(1)}pt`)
            me.chart.changeLineWeight(val)
        })
        $('#fontsize-slider').on('input', function () {
            const val: number = Number($(this).val())
            const ratio = val / 100
            $(this).prev().text(`Font Size : ${val}%`)
            me.chart.chageFontSize(ratio)
        })
        let legendMouseMode: boolean = false
        $('#legend-mouse').on('input', function () {
            legendMouseMode = $(this).prop('checked')
            let cursorMode = legendMouseMode ? 'crosshair' : 'default'
            $('#view').css('cursor', cursorMode)
        })
        $('#view').on('mousedown', function (e) {
            // console.log('mousedown')
            if (legendMouseMode) {
                let rect = e.target.getBoundingClientRect()
                let mouseX: number = (e.clientX - rect.left)
                let mouseY: number = (e.clientY - rect.top)
                // console.log(mouseX, mouseY)
                me.chart.legendMoveByMouse(mouseX, mouseY)
            }
        })
        $('#legend-vis').on('input', function () {
            let flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeLegendVis(flag)
        })



        $(window).on('keydown', function (e) {
            // ショートカット
            console.log(e.key, e.keyCode)
            if (e.altKey) {
                switch (e.keyCode) {
                    // サイズ調整
                    case 186: // 拡大 +
                        var w = Number($('#svg-width').val()) + 10
                        var h = Number($('#svg-height').val()) + 10
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
                    case 79: // サイズの最適化
                        me.optimizeChartSize()
                        break

                    // タブ移動
                    case 49: // 1
                        me.changeUiPane($('#file-ui-select'), $('#file-ui'))
                        break
                    case 50: // 2
                        me.changeUiPane($('#data-ui-select'), $('#data-ui'))
                        break
                    case 51: // 3
                        me.changeUiPane($('#edit-ui-select'), $('#edit-ui'))
                        break
                    case 52: // 4
                        me.changeUiPane($('#vis-ui-select'), $('#vis-ui'))
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
        })
    }

    private optimizeChartSize() {
        let w = Number($('#right-box').width()) * 0.9
        let h = Number($('#right-box').height()) * 0.9
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
                alert(`${data.label}.csv is already read.`)
            }
        });

    }

    private setJson(jsonStr: string) {
        console.log('set Json')
        this.chart.setJSON(jsonStr)
        let dataList: { [key: string]: Data } = this.chart.getDataList()
        for (let key in dataList) {
            console.log(key)
            this.addDataItems(dataList[key])
        }
        this.chart.getGroupKeyList().forEach(key => {
            this.addGroupItems(key)
        })
        this.chart.setUI()
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
            if (confirm('Delete file.')) {
                me.chart.removeData(data.label)
                $item.remove()
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
        })
        $checkbox.on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changeDataVisible(groupKey, flag)
        })
        $color.on('input', function () {
            const color: string = String($(this).val())
            me.chart.changeDataColor(groupKey, color)
        })
        $delete.on('click', function () {
            if (confirm('削除します')) {
                $item.remove()
                me.chart.removeGroup(groupKey)
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
                        if (confirm(`Delete ${flabel} from ${groupKey}.`)) {
                            me.chart.removeDataFromGroup(groupKey, flabel)
                            $gitem.remove()
                        }
                    })
                })

                $detailBtnLabel.text(parseHTMLcode('&#9650;'))
                $detail.show()
            } else {
                $detailBtnLabel.text(parseHTMLcode('&#9660;'))
                $detail.hide()
            }

            // $detail.fadeIn()
            // $('#group-detail-modal').fadeIn()
        })
    }


    private saveFig(type: string): void {
        if ($('#fig').length === 0) {
            alert('Chart is nothing.')
            return;
        } else {
            if (type === 'png') {
                this.saveFigbyPNG()
            } else if (type === 'json') {
                this.saveFigByJson()
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
        const json = this.chart.getJSON()
        let ary = json.split('');
        let blob = new Blob(ary, { type: "text/json" })
        $('<a>', {
            href: URL.createObjectURL(blob),
            download: this.outputName + '.cvv.json'
        })[0].click()
    }
}