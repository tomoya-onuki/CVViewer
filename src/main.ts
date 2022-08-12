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

$(function () {
    new myUI().toggle()
    new Main().init()
});

export class Main {
    private chart: Chart = new Chart();
    private outputName: string = 'figure.png'

    constructor() {
        // this.chart.init();
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


        // タブ
        $('#file-ui-select').on('click', function () {
            changeUiPane($(this), $('#file-ui'));
        });
        $('#edit-ui-select').on('click', function () {
            changeUiPane($(this), $('#edit-ui'));
        });
        $('#save-ui-select').on('click', function () {
            changeUiPane($(this), $('#save-ui'));
        });
        $('#vis-ui-select').on('click', function () {
            changeUiPane($(this), $('#vis-ui'));
        });
        function changeUiPane(selectorElem: any, uiElem: any) {
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


        $('#file-all-select').on('click', function () {
            $('.file-item').each(function () {
                if ($(this).is(':visible')) {
                    $(this).find('input[type="checkbox"]').prop('checked', true)
                }
            })
        })
        $('#file-all-clear').on('click', function () {
            $('.file-item').each(function () {
                if ($(this).is(':visible')) {
                    $(this).find('input[type="checkbox"]').prop('checked', false)
                }
            })
        })
        $('#data-search').on('input', function () {
            const query: string = String($(this).val()).toLowerCase()
            if (query != '') {
                $('.file-item').hide()
                $('.file-item').each(function () {
                    const fname: string = String($(this).find('label').text()).toLowerCase()
                    if (fname.indexOf(query) !== -1) {
                        $(this).show()
                    }
                })
            } else {
                $('.file-item').show()
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
            $('.file-item > input').each(function () {
                const isCheck: boolean = Boolean($(this).prop('checked'))
                if (isCheck) {
                    let label: string = String($(this).attr('id'))
                    selectedDataLabelList.push(label)
                }
            })
            const hasGroupLabel: boolean = me.chart.hasGroupLabel(groupKey)
            if (selectedDataLabelList.length > 0 && !hasGroupLabel) {
                me.chart.groupingData(selectedDataLabelList, groupKey)
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
                    .addClass('group-item')
                    .attr('name', groupKey)
                    .append($div0, $detail)
                $('#group-list').append($item)

                // new myUI().toggle()

                $('.file-item > input').each(function () {
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
                    if (confirm('Delete.')) {
                        $item.remove()
                        me.chart.removeGroup(groupKey)
                    }
                })
                $downBtn.on('click', function () {
                    let myIdx: number = 0
                    $('.group-item').each(function (i) {
                        if (String($(this).attr('name')) === groupKey) {
                            myIdx = i
                        }
                    })
                    if (myIdx < $('.group-item').length - 1) {
                        let nextIdx: number = myIdx + 1
                        $('.group-item').eq(nextIdx).after($('.group-item').eq(myIdx))
                    }

                    let keyList: string[] = []
                    $('.group-item').each(function (i) {
                        let key: string = String($(this).find('input[type="text"]').val())
                        keyList.push(key)
                    })
                    me.chart.sortGroupKeyList(keyList)
                })
                $upBtn.on('click', function () {
                    let myIdx: number = 0
                    $('.group-item').each(function (i) {
                        if (String($(this).attr('name')) === groupKey) {
                            myIdx = i
                        }
                    })
                    if (myIdx > 0) {
                        let preIdx: number = myIdx - 1
                        $('.group-item').eq(preIdx).before($('.group-item').eq(myIdx))
                    }

                    let keyList: string[] = []
                    $('.group-item').each(function (i) {
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
            } else if (hasGroupLabel) {
                alert(`${groupKey} is already exist.`)
            } else {
                alert(' Failed to average. Selected data is none.')
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

        // ピークの表示
        $('#peak-vis').on('input', function () {
            const flag: boolean = Boolean($(this).prop('checked'))
            me.chart.changePeakVis(flag)
        })

        // 軸の範囲のセット
        $('#x-axis-min').on('input', function () {
            let val: number = Number($(this).val())
            me.chart.setXaxisMin(val)
        })
        $('#x-axis-max').on('input', function () {
            let val: number = Number($(this).val())
            me.chart.setXaxisMax(val)
        })
        $('#y-axis-min').on('input', function () {
            let val: number = Number($(this).val())
            me.chart.setYaxisMin(val)
        })
        $('#y-axis-max').on('input', function () {
            let val: number = Number($(this).val())
            me.chart.setYaxisMax(val)
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
            let w = Number($('#right-box').width()) * 0.8
            let h = Number($('#right-box').height()) * 0.8
            if (w < h) {
                h = w * 3 / 4
            } else {
                w = h * 4 / 3
            }
            $('#svg-width').val(w)
            $('#svg-height').val(h)
            me.chart.resize(w, h)
        })

        // テーブルを閉じる
        $('#table-close').on('click', function () {
            $('#table').fadeOut()
            $('#view').fadeIn()
        })


        // 線のスタイル
        $('#line-type-selector').on('input', function () {
            const type: string = String($(this).find('option:selected').val())
            me.chart.changeLineType(type)
        })
        $('#line-weight-slider').on('input', function () {
            const val: number = Number($(this).val())
            $(this).prev().text(`Line Weight : ${val.toFixed(1)}pt`)
            me.chart.changeLineWeight(val)
        })
        $('#legend-slider').on('input', function () {
            const val: number = Number($(this).val())
            const ratio = val / 100
            $(this).prev().text(`Text Size : ${val}%`)
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
    }

    private setData(dataList: Data[]): void {
        const me: Main = this;
        dataList.forEach((data: Data) => {
            // そのデータラベルを持っているかのチェック
            // 持っていないとき = 新規
            if (!this.chart.includesData(data.label)) {

                // データの追加
                // UIに追加
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
                    .addClass('file-item')
                    .append($checkbox, $label, $show, $delete)
                $('#file-list').append($item)

                me.chart.entry(data)

                $delete.on('click', function () {
                    if (confirm('Remove File.')) {
                        me.chart.removeData(data.label)
                        $item.remove()
                    }
                })
                $show.on('click', function () {
                    $('table').remove()
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
                    $('#table').append($tabel)
                    $('#table-title').text(data.label.replace('-', '.'))

                    $('#table').fadeIn()
                    $('#view').fadeOut()
                })
            }
            // データラベルが既に存在するとき、
            else {
                alert(`${data.label}.csv is already load, or file name is duplicated.`)
            }
        });

    }


    private saveFig(type: string): void {
        if ($('#fig').length === 0) {
            alert('Chart is not exist.')
            return;
        }
        this.saveFigbyPNG()
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