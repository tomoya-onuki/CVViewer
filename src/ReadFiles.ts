import { Data } from './Data';

export class ReadFiles {
    constructor() {

    }

    public readFiles(files: any[]): Promise<any> {
        const me: ReadFiles = this;
        let dataList: Data[] = [];

        return new Promise(function (resolve, reject) {
            me.read(files, 0, dataList, resolve);
        });
    }

    private read(files: any[], idx: number, dataList: Data[], resolve: any): Promise<any> {
        const me: ReadFiles = this;
        return new Promise(function (resolve, reject) {
            // 現在のIndexが配列の要素数を超えたら処理を終了
            if (idx >= files.length) {
                resolve(false);
            }

            const file = files[idx];
            // csvファイルのみを処理
            if (file.name.indexOf('.csv') != -1) {
                const label = file.name.replace('.csv', '');
                var fileReader = new FileReader();
                fileReader.readAsText(file);
                // console.log('read '+file.name)
                fileReader.onloadend = (e: any) => {
                    const text: string = e.target.result;
                    const csvData: string[][] = me.parseCsv(text);
                    dataList.push(new Data(csvData, label));
                    resolve(true);
                }
            } else {
                alert(`${file.name} はcsvファイルではありません。\n${file.name} is not csv format.\n`);
                resolve(true);
            }

        })
            .then((result) => {
                if (result) { // trueの場合ループ続行
                    return me.read(files, idx + 1, dataList, resolve);
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