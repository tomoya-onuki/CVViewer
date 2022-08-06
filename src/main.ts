import * as d3 from 'd3';
import { DSVRowArray, DSVRowString, easeCircle } from 'd3';
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


        // タブ
        $('#file-ui-select').on('click', function () {
            changeUiPane($(this), $('#file-ui'));
        });
        $('#graph-ui-select').on('click', function () {
            changeUiPane($(this), $('#graph-ui'));
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

        // グラフの保存
        $('#save-fig-btn').on('click', function () {
            const type: string = String($('#fig-type > option:selected').val())
            me.saveFig(type);
        });

        $('#fig-type').on('change', () => changeFname())
        $('#save-fig-name').on('change', () => changeFname())
        const changeFname = () => {
            let extension: string = String($('#fig-type > option:selected').val())
            let val: string = String($('#save-fig-name').val())
            let fname: string = ''
            if (val.indexOf('.') != -1) {
                let token: string[] = val.split('.')
                token.slice(0, -1).forEach(str => fname += (str + '.'))
                fname += extension
            } else if (val === '') {
                fname = 'figure.' + extension
            } else {
                fname = val + '.' + extension
            }
            me.outputName = fname;
            $('#save-fig-name').val(fname)
        }

        $('#set-graph-label-x').on('input', function () {
            me.chart.setAxisLabelX(String($(this).val()));
        });
        $('#set-graph-label-y').on('input', function () {
            me.chart.setAxisLabelY(String($(this).val()));
        });
        $('#set-graph-title').on('input', function () {
            me.chart.setTitleLabel(String($(this).val()));
        });

        $('#file-selector').on('change', function () {
            let label: string = String($(this).find('option:selected').val());
            console.log(label)
            me.chart.setVisLabel(label);
            me.chart.draw();
            // me.chart.dump()
        });

        // フォーカスが外れたら自動保存
        $('#graph-ui').find('input').blur(function () {
            const flag: boolean = Boolean($('#auto-save').prop('checked'))
            console.log(`auto save ${flag}`)
            if (flag) {
                let tmp = me.outputName
                me.outputName = 'auto-save-' + new Date().toLocaleString() + '-' + me.outputName.replace('.png', '')
                me.saveFig('svg')
                me.outputName = tmp
            }
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