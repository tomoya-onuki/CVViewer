import $ = require('jquery');

// HTML特殊文字を使えるようにした
const domParser: DOMParser = new DOMParser();
const parseHTMLcode = (code: string): string => {
    return String(domParser.parseFromString(code, 'text/html').body.innerText)
}

export class myUI {
    constructor() {
    }

    public toggleSwitch() {
        $('.toggle-switch').each(function () {
            let toggleBox = $('<div></div>').addClass('toggle-box')
            // let toggleBox = $('<span></span>').addClass('toggle-box')
            $(this).after(toggleBox)

            let tmp = $(this)
            let id = String($(this).attr('id'))
            $(this).remove()

            let label = $('<label></label>').addClass('check').attr('for', id)
            let thumb = $('<div></div>').addClass('thumb')
            label.append(thumb)

            toggleBox.append(tmp, label)
        })
    }

    public fontSelector() {
        $('.font-selector').each(function () {
            // 外箱の作成
            const $selectBox = $(this).addClass('font-selector-box')
            // ドロップダウンリスト
            const $list = $('<div></div>').addClass('list')
            const $label = $('<div></div>').addClass('label')
            const $btn = $('<div>&#9660;</div>').addClass('down-btn')

            const $radios = $(this).find('input[type="radio"]')
            $radios.each(function (i, elem) {
                const id = i
                const val: string = String($(this).val())
                // const font: string = String($(this).css('font-family'))
                const font: string = val
                const text: string = String($(this).attr('text'))

                // ドロップダウンでみえる選択肢
                $('<label></label>')
                    .text(text)
                    .attr('for', id)
                    .css('font-family', font)
                    .addClass('item')
                    .appendTo($list)

                // ラジオボタンは非表示にして、上のラベルと対応させる
                $(this).addClass('radio').attr('id', id).val(val)

                // チェックが入ってるやつをデフォルトに
                if ($(this).prop('checked')) {
                    $label.text(text)
                }
            })

            $selectBox.append($btn, $label, $list)

            $label.on('click', function () {
                if ($list.is(':hidden')) {
                    $list.show()
                } else {
                    $list.hide()
                }
            })

            $list.find('.item').each(function () {
                $(this).on('click', function () {
                    const font: string = String($(this).css('font-family'))
                    const text: string = String($(this).text())
                    $label.text(text).css('font-family', font)
                    $list.hide()
                })
            })
            // $(window).on('click', function() {
            //     $list.hide()
            // })
        })
    }

    public switchBtn() {
        $('.switch-btn').each(function () {
            const $box = $('<div></div>').addClass('switch-btn-box')
            $(this).after($box)

            let id: string = String($(this).attr('id'))
            let text: string = String($(this).attr('text'))
            let cla: string = String($(this).attr('class'))

            const $label = $('<label></label>')
                .text(text)
                .attr('for', id)
                .addClass(cla)
                .addClass('check')

            $box.append($(this), $label)
            // $(this).remove()

            // $(this).on('input', function () {
            //     if ($(this).prop('checked')) {
            //         $label.css({
            //             'background': '#4287f5',
            //             'color': '#FFF',
            //             'border': 'solid 1px #4287f5'
            //         })
            //         // $(this).prop('checked', true)
            //     } else {
            //         $label.css({
            //             'background': '#FFF',
            //             'color': '#000',
            //             'border': 'solid 1px #666'
            //         })
            //         // $(this).prop('checked', false)
            //     }
            // })
        })
    }

    public hideBtn() {
        $('.hide-contents').each(function (idx) {
            const isCheck = $(this).attr('checked')
            const label = $(this).text() + " "
            $(this).text("")

            const $label = $('<label></label>')
                .text(label + parseHTMLcode('&#9650;'))
                .attr('for', `hide-btn${idx}`)
                .addClass('hide-btn')

            const $chbox = $('<input>')
                .attr('id', `hide-btn${idx}`)
                .attr('type', 'checkbox')
                .addClass('hide-checkbox')
                .prop('checked', isCheck)

            $(this).append($label, $chbox)

            let id = $(this).attr('for')
            let $target = $(`#${id}`)

            if (!isCheck) {
                $label.text(label + parseHTMLcode('&#9660;'))
                $target.hide()
            }

            $chbox.on('input', function () {
                const isShow: boolean = $(this).prop('checked')
                if (isShow) {
                    $label.text(label + parseHTMLcode('&#9650;'))
                    $target.show()
                } else {
                    $label.text(label + parseHTMLcode('&#9660;'))
                    $target.hide()
                }
            })
        })
    }
}
