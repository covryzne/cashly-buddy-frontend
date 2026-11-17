"use client";
import { evolutionStages } from "./profile-model";
import { useHomeData } from "@/features/home/use-home-data";
import { Button } from "@/components/ui/button";
export function EvolutionGuide({tab,onTab,selectedStage}:{tab:"evolution"|"freeze";onTab:(tab:"evolution"|"freeze")=>void;selectedStage?:number}) {
 const game=useHomeData();
 return <div className="profile-guide-content">
  {!selectedStage && <div className="profile-guide-tabs"><Button variant="secondary" onClick={()=>onTab("evolution")} aria-pressed={tab==="evolution"}>Evolusi hero</Button><Button variant="secondary" onClick={()=>onTab("freeze")} aria-pressed={tab==="freeze"}>Proteksi streak</Button></div>}
  {selectedStage || tab==="evolution" ? <><p>Level hero mengikuti streak berjalan. Jika streak putus tanpa pemulihan, hero kembali ke level 1.</p><ol className="evolution-guide-list">{evolutionStages.filter(stage=>!selectedStage||stage.stage===selectedStage).map(stage=><li key={stage.stage}><span className="profile-stage-number">{stage.stage}</span><div><h3>{stage.name}</h3><p>{stage.days===0 ? "Tersedia sejak 0 hari" : `${stage.days} hari streak`}</p><small>{stage.description}</small></div><span>{stage.stage===game.mascotStage ? "Dipakai" : stage.stage<game.mascotStage ? "Tercapai" : "Terkunci"}</span></li>)}</ol></> : <><p>Lima jatah proteksi setiap bulan, reset tanggal 1 sesuai timezone akun. Sisa jatah tidak menumpuk.</p><ul className="profile-rule-list"><li>Satu tanggal terlewat memakai satu jatah. Pemakaian selalu manual.</li><li>Pulihkan seluruh tanggal yang diperlukan, maksimal empat tanggal sebelumnya. Lima hari terlewat mengakhiri kesempatan pemulihan.</li><li>Protected menjaga kontinuitas, tidak menambah hari aktif. Pulihkan &amp; check-in menambahkan hari ini paling banyak sekali.</li><li>Kuota mengikuti bulan saat pemulihan dilakukan. Jika tidak cukup, tidak ada pemotongan sebagian.</li></ul></>}
 </div>;
}
