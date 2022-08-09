import { Data } from './Data';

export class DataSet extends Data {

    private _color: string = '#000'
    private _dash: string = '1, 0'
    private _visible: boolean = true
    private _dataList: Data[] = []


    constructor(label: string, groupDataList: Data[]) {
        super(label)
        this._dataList = groupDataList
        this.meanCurrent()
    }

    public set color(c: string) {
        this._color = c
    }
    public get color(): string {
        return this._color
    }

    public set dash(d: string) {
        this._dash = d
    }
    public get dash(): string {
        return this._dash
    }

    public dataLabelList(): string[] {
        return this._dataList.map(data => data.label)
    }

    public removeData(label: string) {
        for (let i = 0; i < this._dataList.length; i++) {
            if (this._dataList[i].label === label) {
                this._dataList.splice(i, 1)
                break
            }
        }
        console.log(this._dataList)
        this.meanCurrent()
    }

    private meanCurrent() {
        if (this._dataList.length > 0) {
            // 初期化
            this.values = []
            this._dataList[0].values.forEach(v => {
                this.values.push({
                    current: 0,
                    potential: v.potential
                })
            })
            // 合計を出す
            for (let i = 0; i < this._dataList.length; i++) {
                for (let j = 0; j < this._dataList[i].values.length; j++) {
                    this.values[j].current += this._dataList[i].values[j].current
                }
            }
            // 平均化
            for (let j = 0; j < this.values.length; j++) {
                this.values[j].current /= this._dataList.length
            }
        }
    }

    public set visible(flag: boolean) {
        this._visible = flag
    }
    public get visible(): boolean {
        return this._visible
    }
}