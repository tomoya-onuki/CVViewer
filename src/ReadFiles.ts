import $ = require('jquery');
declare var require: any;
import { Data } from './Data';

let lang: string = ''
// const lang: string = 'en'

export class ReadFiles {
    constructor() {
        lang = String($('html').attr('lang'))
    }

    public readTXT(files: any[], header: string, separator: string, pCol: number): Promise<any> {
        const me: ReadFiles = this;
        let dataList: Data[] = [];

        return new Promise(function (resolve) {
            me.read(files, 0, dataList, header, separator, pCol, resolve);
        });
    }

    public readJSON(file: any): Promise<string> {
        return new Promise(function (resolve) {
            if (file.name.indexOf('.json') != -1) {
                var fileReader = new FileReader()

                fileReader.readAsText(file)
                fileReader.onloadend = (e: any) => {
                    const text: string = e.target.result;
                    const json = JSON.parse(text)
                    if (json.id == 'cvviewer') {
                        resolve(text)
                    } else {
                        if (lang === 'ja')
                            alert(`${file.name} はサポートされていないファイルです`)
                        else if (lang === 'en')
                            alert(`${file.name} is NOT supported.`)
                    }
                }
            }
        });
    }

    private read(files: any[], idx: number, dataList: Data[], header: string, separator: string, pCol: number, resolve: any): Promise<any> {
        const me: ReadFiles = this;

        const cCol: number = pCol === 0 ? 1 : 0

        return new Promise(function (resolve) {
            // 現在のIndexが配列の要素数を超えたら処理を終了
            if (idx >= files.length) {
                resolve(false);
            }
            console.log(separator)

            const file = files[idx];
            // csvファイルのみを処理
            if (file.name.indexOf('.txt') != -1
                || file.name.indexOf('.csv') != -1
                || file.name.indexOf('.tsv') != -1) {
                const label = file.name.replace('.', '-')
                var fileReader = new FileReader();
                fileReader.readAsText(file);
                // console.log('read '+file.name)
                fileReader.onloadend = (e: any) => {
                    const text: string = e.target.result;
                    const lines: string[] = text.split('\n')
                    let data: Data = new Data(label)
                    let start: boolean = false
                    for (let i = 0; i < lines.length; i++) {
                        if (start) {
                            let token: string[] = lines[i].replace('\r', '').split(new RegExp(separator))

                            if (token.length === 2) {
                                // let potential: number = parseFloat(token[pCol])
                                let potential: string = String(token[pCol].replace('\s', ''))
                                let current: string = String(token[cCol].replace('\s', ''))
                                if (potential && current) {
                                    data.entry(potential, current)
                                }
                            }

                        }

                        if (lines[i].indexOf(header) != -1) {
                            start = true
                        }
                    }
                    if (start) {
                        dataList.push(data)
                    } else {
                        if (lang === 'ja')
                            alert(`${file.name} の読み込みにエラーが起きました。次の可能性があります。\n- サポートされていないファイルである。\n- ヘッダーの指定が不適切である。`)
                        else if (lang === 'en')
                            alert(`Loading Error : ${file.name}\n- ${file.name} is NOT supported.\n- OR, The header is improperly specified. `)
                    }
                    resolve(true)
                }
            }
            else if (file.name.indexOf('.json') != -1) {
                resolve(true);
            } else {
                if (lang === 'ja')
                    alert(`${file.name} はサポートしていません。`);
                else if (lang === 'en')
                    alert(`${file.name} is NOT supported.`);
                resolve(true);

            }

        })
            .then((result) => {
                if (result) { // trueの場合ループ続行
                    return me.read(files, idx + 1, dataList, header, separator, pCol, resolve);
                } else {
                    resolve(dataList);
                }
            })
    }

    private parseCsv(csv: string): string[][] {
        let tmp: string[] = [];
        csv = csv.replace(/("[^"]*")+/g, (match) => {
            tmp.push(match.slice(1, -1).replace(/""/g, '"').replace(/\n/g, ''));
            return '[TMP]';
        });
        return csv.split("\n").map((row) => {
            return row.split(',').map((val) => {
                if (val == '[TMP]') {
                    return String(tmp.shift());
                } else { // 日本語の空白のみ削除
                    return val.replace(/(\s+[^A-Za-z]|[^A-Za-z]\s+)/g, (match) => {
                        return match.replace(/\s+/g, '');
                    })
                }
            });
        });
    }
}