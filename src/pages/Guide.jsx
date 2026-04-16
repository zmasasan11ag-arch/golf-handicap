import React, { useState } from 'react'
import { WHS_TABLE } from '../utils/handicapCalc.js'
import { courses } from '../data/courses.js'

export default function Guide() {
  const [openSection, setOpenSection] = useState(null)

  const toggle = (key) => setOpenSection(openSection === key ? null : key)

  return (
    <div className="page">
      <header className="page-header">
        <h1>計算方式ガイド</h1>
        <p className="subtitle">WHS（ワールドハンデキャップシステム）/ JGA方式</p>
      </header>

      <div className="guide-sections">

        <Accordion
          title="ハンデキャップインデックスとは"
          isOpen={openSection === 'what'}
          onToggle={() => toggle('what')}
        >
          <p>
            ハンデキャップインデックス（HI）は、WHS（ワールドハンデキャップシステム）に
            基づいた、コースや天候に左右されないゴルファーの実力の指標です。
            JGAは2022年からWHSを採用しています。
          </p>
          <ul>
            <li>最大値: <strong>54.0</strong></li>
            <li>マイナス値も可能（プロや上級者）</li>
            <li>直近20ラウンドのデータから計算</li>
          </ul>
        </Accordion>

        <Accordion
          title="コースハンデキャップの計算"
          isOpen={openSection === 'ch'}
          onToggle={() => toggle('ch')}
        >
          <div className="formula-box">
            <div className="formula">
              コースハンデ = round( HI × Slope ÷ 113 )
            </div>
          </div>
          <table className="guide-table">
            <thead>
              <tr><th>用語</th><th>説明</th></tr>
            </thead>
            <tbody>
              <tr><td>HI</td><td>ハンデキャップインデックス</td></tr>
              <tr><td>Slope</td><td>スロープレーティング（コース難易度）</td></tr>
              <tr><td>113</td><td>標準スロープ値（基準値）</td></tr>
            </tbody>
          </table>
          <p className="example">
            例: HI=15.0, Slope=140 の場合<br />
            CH = round( 15.0 × 140 ÷ 113 ) = round( 18.6 ) = <strong>19</strong>
          </p>
          <p>
            ※ HI未確定（初回ラウンド）の場合はコースハンデ <strong>20</strong> をデフォルト使用します。
          </p>
        </Accordion>

        <Accordion
          title="ESC（イクイタブル・ストローク・コントロール）"
          isOpen={openSection === 'esc'}
          onToggle={() => toggle('esc')}
        >
          <p>
            ESCはハンデキャップ計算のためにスコアを調整する上限制度です。
            コースハンデキャップの合計値により、<strong>全ホール一律</strong>に上限打数が決まります。
            ホールごとのストローク配分は行いません。
          </p>
          <table className="guide-table">
            <thead>
              <tr><th>コースハンデ</th><th>1ホールの上限</th></tr>
            </thead>
            <tbody>
              <tr><td>0〜9</td><td>ダブルボギー（par + 2）</td></tr>
              <tr><td>10〜19</td><td>7打</td></tr>
              <tr><td>20〜29</td><td>8打</td></tr>
              <tr><td>30〜39</td><td>9打</td></tr>
              <tr><td>40以上</td><td>10打</td></tr>
            </tbody>
          </table>
          <p className="example">
            例: HI=18.0, Slope=140 の場合<br />
            CH = round( 18.0 × 140 ÷ 113 ) = round( 22.3 ) = 22 → コースハンデ20〜29<br />
            → 全ホール上限 <strong>8打</strong>
          </p>
          <p>
            ※ HI未確定の初回ラウンドはコースハンデ <strong>20</strong>（上限8打）をデフォルト使用します。
          </p>
        </Accordion>

        <Accordion
          title="スコアディファレンシャルの計算"
          isOpen={openSection === 'diff'}
          onToggle={() => toggle('diff')}
        >
          <div className="formula-box">
            <div className="formula">
              Differential = (ESC調整後スコア − CR) × 113 ÷ Slope
            </div>
          </div>
          <p className="example">
            例: 調整後スコア=85, CR=71.3, Slope=126 の場合<br />
            Differential = (85 − 71.3) × 113 ÷ 126 = 13.7 × 0.897 = <strong>12.3</strong>
          </p>
          <p>
            ディファレンシャルはコースの難易度を補正した「実質スコア」で、
            コースが違っても比較できます。
          </p>
        </Accordion>

        <Accordion
          title="ハンデキャップインデックスの確定"
          isOpen={openSection === 'hi'}
          onToggle={() => toggle('hi')}
        >
          <div className="formula-box">
            <div className="formula">
              HI = （ベストN個のDifferentialの平均 + 調整値） × 0.96
            </div>
          </div>
          <p>
            直近20ラウンドからベストN個のディファレンシャルを選び、
            平均に0.96をかけます。ラウンド数が少ない場合は下表の通りです。
          </p>
          <div className="table-scroll">
            <table className="guide-table whs-table">
              <thead>
                <tr>
                  <th>ラウンド数</th>
                  <th>使用数</th>
                  <th>調整値</th>
                </tr>
              </thead>
              <tbody>
                {WHS_TABLE.map(row => (
                  <tr key={row.n} className={row.n >= 20 ? 'row-full' : ''}>
                    <td>{row.n}</td>
                    <td>{row.use}</td>
                    <td>{row.adj > 0 ? `+${row.adj}` : row.adj === 0 ? '0' : row.adj}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion
          title="スコアの色分けについて"
          isOpen={openSection === 'color'}
          onToggle={() => toggle('color')}
        >
          <div className="color-legend">
            {[
              { label: 'イーグル以上（par−2以下）', cls: 'score-eagle',  example: '2', color: '赤' },
              { label: 'バーディ（par−1）',          cls: 'score-birdie', example: '3', color: 'オレンジ' },
              { label: 'パー（E）',                  cls: 'score-par',    example: '4', color: '水色' },
              { label: 'ボギー（par+1）',             cls: 'score-bogey',  example: '5', color: '紺色' },
              { label: 'ダブルボギー（par+2）',       cls: 'score-double', example: '6', color: '緑色' },
              { label: 'トリプル以上（par+3〜）',     cls: 'score-triple', example: '7', color: '黒' },
            ].map(item => (
              <div key={item.cls} className="color-item">
                <span className={`score-cell ${item.cls}`}>{item.example}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>{item.color}</div>
                </div>
              </div>
            ))}
          </div>
        </Accordion>

        <Accordion
          title="三好CC コースデータ"
          isOpen={openSection === 'course'}
          onToggle={() => toggle('course')}
        >
          <p className="info-box warning">
            下記は参考値です。JGA公式サイトで最新の公認データをご確認ください。
          </p>
          <CourseDataTable />
        </Accordion>

      </div>
    </div>
  )
}

function Accordion({ title, isOpen, onToggle, children }) {
  return (
    <div className={`accordion${isOpen ? ' open' : ''}`}>
      <button className="accordion-header" onClick={onToggle}>
        <span>{title}</span>
        <span className="accordion-icon">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  )
}

function CourseDataTable() {
  return (
    <>
      {courses.map(c => (
        <div key={c.id} className="course-data-block">
          <h4>{c.name}（Par {c.par}）</h4>
          {c.greens.map(g => (
            <div key={g.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-dark)', marginBottom: 4 }}>
                {g.name}
              </div>
              <table className="guide-table">
                <thead>
                  <tr><th>ティー</th><th>CR</th><th>Slope</th></tr>
                </thead>
                <tbody>
                  {g.tees.map(t => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{t.cr}</td>
                      <td>{t.slope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
