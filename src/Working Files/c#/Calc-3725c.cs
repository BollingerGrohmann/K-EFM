using System;
using System.Collections;
using System.Collections.Generic;

using Rhino;
using Rhino.Geometry;

using Grasshopper;
using Grasshopper.Kernel;
using Grasshopper.Kernel.Data;
using Grasshopper.Kernel.Types;

using System.Runtime.Serialization;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using Karamba.Models;
using KarambaCommon;
using Karamba.Elements;
using Karamba.Geometry;
using Karamba.Loads.Combination;
using feb;
using Karamba.GHopper.Geometry;
using Karamba.Results;
using System.Linq.Expressions;
using System.Reflection.Metadata.Ecma335;


/// <summary>
/// This class will be instantiated on demand by the Script component.
/// </summary>
public abstract class Script_Instance_3725c : GH_ScriptInstance
{
  #region Utility functions
  /// <summary>Print a String to the [Out] Parameter of the Script component.</summary>
  /// <param name="text">String to print.</param>
  private void Print(string text) { /* Implementation hidden. */ }
  /// <summary>Print a formatted String to the [Out] Parameter of the Script component.</summary>
  /// <param name="format">String format.</param>
  /// <param name="args">Formatting parameters.</param>
  private void Print(string format, params object[] args) { /* Implementation hidden. */ }
  /// <summary>Print useful information about an object instance to the [Out] Parameter of the Script component. </summary>
  /// <param name="obj">Object instance to parse.</param>
  private void Reflect(object obj) { /* Implementation hidden. */ }
  /// <summary>Print the signatures of all the overloads of a specific method to the [Out] Parameter of the Script component. </summary>
  /// <param name="obj">Object instance to parse.</param>
  private void Reflect(object obj, string method_name) { /* Implementation hidden. */ }
  #endregion

  #region Members
  /// <summary>Gets the current Rhino document.</summary>
  private readonly RhinoDoc RhinoDocument;
  /// <summary>Gets the Grasshopper document that owns this script.</summary>
  private readonly GH_Document GrasshopperDocument;
  /// <summary>Gets the Grasshopper script component that owns this script.</summary>
  private readonly IGH_Component Component;
  /// <summary>
  /// Gets the current iteration count. The first call to RunScript() is associated with Iteration==0.
  /// Any subsequent call within the same solution will increment the Iteration count.
  /// </summary>
  private readonly int Iteration;
  #endregion
  /// <summary>
  /// This procedure contains the user code. Input parameters are provided as regular arguments,
  /// Output parameters as ref arguments. You don't have to assign output parameters,
  /// they will have a default value.
  /// </summary>
  #region Runscript
  private void RunScript(bool switchFlag, List<double> phi, List<double> vZ, List<double> mZ, List<double> mY, List<double> n, double L, double stone_thk, double h_eff, double fb, double fds, double gammaMs, double fvk0, ref object verified, ref object As_top, ref object As_bottom, ref object As2, ref object As3)
  {


    int top, bottom;
    if (switchFlag)
    {
      top = 1;
      bottom = 0;
    }
    else
    {
      top = 0;
      bottom = 1;
    }

    List<string> verificationLC1 = new List<string>();
    double as_top = 0, as_bot = 0, as_2 = 0, as_3 = 0;

    bool boum_LC1 = CalculateReinforcement( top,
                                            bottom,
                                            phi,
                                            mY,    // axial moment? (used for reduced moment calculation)
                                            mZ,    // out-of-plane bending moment
                                            n,      // axial force
                                             L,
                                             stone_thk,
                                             fvk0,
                                             gammaMs,
                                             fb,
                                            vZ,    // shear forces (vertical)
                                            h_eff,
                                            fds,
                                            ref verificationLC1,
                                            ref as_top,
                                            ref as_bot,
                                            ref as_2,
                                            ref as_3);
    verified = verificationLC1;
    As_top = as_top;
    As_bottom = as_bot;
    As2 = as_2;
    As3 = as_3;

  }
  #endregion
  #region Additional


  //--------------------------------------------------------------------------------
  // 1) Calculate Nodal Displacements
  //--------------------------------------------------------------------------------

  //--------------------------------------------------------------------------------
  // 2) Calculate Beam Forces
  //--------------------------------------------------------------------------------

  //--------------------------------------------------------------------------------
  // 4) TRIMTREE
  //--------------------------------------------------------------------------------
  private DataTree<T> TrimTree<T>(DataTree<T> tree, int depth)
  {
    DataTree<T> trimTree = new DataTree<T>();
    for (int i = 0; i < tree.BranchCount; i++)
    {
      GH_Path path = new GH_Path(tree.Path(i));
      List<T> tree_list = tree.Branch(i);
      var shift = Math.Abs(depth);
      // Positive shift
      if (depth >= 0)
      {
        while (shift > 0 && path.Length > 1)
        {
          path = path.CullFirstElement();
          shift -= 1;
        }
      }
      // Negative shift
      else
      {
        while (shift > 0 && path.Length > 1)
        {
          path = path.CullElement();
          shift -= 1;
        }
      }
      foreach (var item in tree_list) trimTree.Add(item, path);
    }
    return trimTree;
  }
  class T
  { }
  //--------------------------------------------------------------------------------
  // 5) Calculation of reinforcement quantities
  //--------------------------------------------------------------------------------
  
  
  private bool CalculateReinforcement(
      int top,
      int bottom,
      List<double> phi,
      List<double> _m_y,    // axial moment? (used for reduced moment calculation)
      List<double> _m_z,    // out-of-plane bending moment
      List<double> _n,      // axial force
      double L,
      double stone_thk,
      double fvk0,
      double gamma_ms,
      double fb,
      List<double> _v_z,    // shear forces (vertical)
      double h_eff,
      double fds,
      ref List<string> verStrings,
      ref double as_top,
      ref double as_bot,
      ref double as_2,
      ref double as_3)
  {
    // Define constants
    double E_mu = 0.0035;       // material strain parameter
    double fyd = 500.0;         // yield strength (connection from the outside)
    double Asv_min = 0.000314;  // minimum vertical reinforcement section (m²)

    // Convert forces to absolute values.
    List<double> n = Absolute(_n);
    List<double> v_z = Absolute(_v_z);
    List<double> m_y = Absolute(_m_y);
    List<double> m_z = Absolute(_m_z);

    // --- In-plane bending (NF EN 1996-1-1 §8.7.2) ---
    double Ma_top = Ma(m_y[top], n[top], L);
    double Ma_bottom = Ma(m_y[bottom], n[bottom], L);

    // Compute reduced moment factors (Mu)
    double Mu_top = Mu(Ma_top, fds, phi[top], L, stone_thk);
    double Mu_bottom = Mu(Ma_bottom, fds, phi[bottom], L, stone_thk);

    // Effective compression lengths in the plane of the wall
    double Lc_top = LcReinf(Mu_top, L);
    double Lc_bottom = LcReinf(Mu_bottom, L);

    // Reinforcement spacing in the wall plane
    double d_val = D(L);

    // Compute design strain in reinforcement, limited by fyd/200000
    double E_su_top = E_su(E_mu, d_val, Lc_top, fyd);
    double E_su_bottom = E_su(E_mu, d_val, Lc_bottom, fyd);

    // Required vertical reinforcement sections (m²) – Asvcalc and then the used value
    double Asv_calc_top = Asv_calc(Lc_top, stone_thk, phi[top], fds, n[top], E_su_top);
    double Asv_calc_bottom = Asv_calc(Lc_bottom, stone_thk, phi[bottom], fds, n[bottom], E_su_bottom);
    double Asv_top = Asv(Asv_calc_top, Asv_min);
    double Asv_bottom = Asv(Asv_calc_bottom, Asv_min);

    // Normal stress along the wall (MPa)
    double sigma_d_top = sigma_d(n[top], m_y[top], L, stone_thk);
    double sigma_d_bottom = sigma_d(n[bottom], m_y[bottom], L, stone_thk);

    double ratio1_top = ratio1(sigma_d_top, fds);
    double ratio1_bottom = ratio1(sigma_d_bottom, fds);

    if (sigma_d_top < fds)
      verStrings.Add("Crush test top: ok; " + ratio1_top.ToString("F2") + "%");
    else
      verStrings.Add("Crush test top: not ok; " + ratio1_top.ToString("F2") + "%");

    if (sigma_d_bottom < fds)
      verStrings.Add("Crush test bottom: ok; " + ratio1_bottom.ToString("F2") + "%");
    else
      verStrings.Add("Crush test bottom: not ok; " + ratio1_bottom.ToString("F2") + "%");

    // --- Out-of-plane bending (NF EN 1996-1-1 §8.7.3) ---
    double dtr_val = dtr(stone_thk);
    double nf = 1.0; // ηf (assumed value)
    double z_top = z(dtr_val, Asv_top, fyd, L, nf, fds);
    double z_bottom = z(dtr_val, Asv_bottom, fyd, L, nf, fds);
    double Mrd_top = Mrd(Asv_top, fyd, z_top);
    double Mrd_bottom = Mrd(Asv_bottom, fyd, z_bottom);

    double ratio2_top = ratio2(m_z[top], Mrd_top);
    double ratio2_bottom = ratio2(m_z[bottom], Mrd_bottom);

    if (m_z[top] < Mrd_top)
      verStrings.Add("Local bending verification top: ok " + ratio2_top.ToString("F2") + "%");
    else
      verStrings.Add("Local bending verification top: not ok " + ratio2_top.ToString("F2") + "%");

    if (m_z[bottom] < Mrd_bottom)
      verStrings.Add("Local bending verification bottom: ok " + ratio2_bottom.ToString("F2") + "%");
    else
      verStrings.Add("Local bending verification bottom: not ok " + ratio2_bottom.ToString("F2") + "%");

    // --- Walls under horizontal in-plane loads (NF EN 1996-1-1 §8.8.2) ---
    double fvk_val = fvk_reinf(fvk0, d_val, fb);
    double fvd_val = fvd_reinf(fvk_val, gamma_ms);
    double Vrd1_val = Vrd1_reinf(fvd_val, d_val, stone_thk);

    double ratio3_top = ratio3(Vrd1_val, v_z[top]);
    double ratio3_bottom = ratio3(Vrd1_val, v_z[bottom]);

    if (v_z[top] < Vrd1_val)
      verStrings.Add("Shear verification top: ok " + ratio3_top.ToString("F2") + "%");
    else
      verStrings.Add("Shear verification top: not ok " + ratio3_top.ToString("F2") + "%");

    if (v_z[bottom] < Vrd1_val)
      verStrings.Add("Shear verification bottom: ok " + ratio3_bottom.ToString("F2") + "%");
    else
      verStrings.Add("Shear verification bottom: not ok " + ratio3_bottom.ToString("F2") + "%");

    // --- Horizontal reinforcement verification ---
    double Asw_min_val = Asw_min_reinf(stone_thk, h_eff);
    int n_reinf_val = n_reinf(h_eff, stone_thk);
    double Asw_val = Asw_reinf(Asw_min_val, n_reinf_val);
    double smax_val = smax_reinf(stone_thk);
    double d2_val = d2_reinf(h_eff);
    double Vrd2_val = Vrd2_reinf(Asw_val, fyd, d2_val, smax_val);
    double check1_val = check1_reinf(Vrd1_val, Vrd2_val);
    double check2_val = check2_reinf(fds, stone_thk, d2_val);

    if (check1_val <= check2_val)
      verStrings.Add("Vrd1+Vrd2 ≤ 0.3*fds*stone_thk*d2: ok");
    else
      verStrings.Add("Vrd1+Vrd2 ≤ 0.3*fds*stone_thk*d2: not ok");

    double ratio4_top = ratio4_reinf(v_z[top], Vrd1_val, Vrd2_val);
    double ratio4_bottom = ratio4_reinf(v_z[bottom], Vrd1_val, Vrd2_val);

    if (v_z[top] < Vrd1_val + Vrd2_val)
      verStrings.Add("Horizontal load resistance with horizontal reinforcement top: ok " + ratio4_top.ToString("F2") + "%");
    else
      verStrings.Add("Horizontal load resistance with horizontal reinforcement top: not ok " + ratio4_top.ToString("F2") + "%");

    if (v_z[bottom] < Vrd1_val + Vrd2_val)
      verStrings.Add("Horizontal load resistance with horizontal reinforcement bottom: ok " + ratio4_bottom.ToString("F2") + "%");
    else
      verStrings.Add("Horizontal load resistance with horizontal reinforcement bottom: not ok " + ratio4_bottom.ToString("F2") + "%");

    // --- Vertical tie rods ---
    as_top = As_reinf(Asv_top);
    as_bot = As_reinf(Asv_bottom);
    verStrings.Add("Vertical reinforcement top - As: " + as_top.ToString("F2") + " mm²");
    verStrings.Add("Vertical reinforcement bottom - As: " + as_bot.ToString("F2") + " mm²");

    // Optionally, if shear ratios exceed 100, compute horizontal reinforcement thicknesses.
    if (Math.Max(ratio3_top, ratio3_bottom) > 100)
    {
      as_2 = Math.Ceiling(As2_reinf(Asw_min_val, d_val));
      verStrings.Add("Thickness of horizontal reinforcement in a bed joint: " + as_2.ToString("F2") + " mm");

      as_3 = Math.Ceiling(As3_reinf(Asw_val, E_mu));
      verStrings.Add("Thickness of horizontal reinforcement over the entire vertical cross-section: " + as_3.ToString("F2") + " mm");
    }
    else
    {
      verStrings.Add("No horizontal reinforcement");
    }

    // Determine overall pass/fail: for example, if any "not ok" message appears, we return false.
    // (Here we simply flag a failure if any ratio exceeds 100% or check conditions are not met.)
    bool crushOk = (sigma_d_top < fds) && (sigma_d_bottom < fds);
    bool bendingOk = (m_z[top] < Mrd_top) && (m_z[bottom] < Mrd_bottom);
    bool shearOk = (v_z[top] < Vrd1_val) && (v_z[bottom] < Vrd1_val);
    bool horzOk = (v_z[top] < Vrd1_val + Vrd2_val) && (v_z[bottom] < Vrd1_val + Vrd2_val);

    return crushOk && bendingOk && shearOk && horzOk;
  }
  private List<double> Absolute(List<double> toConvert)
  {
    List<double> result = new List<double>();
    foreach (double val in toConvert)
      result.Add(Math.Abs(val));
    return result;
  }

  private double Ma(double My, double N, double L)
  {
    return My + N * L / 2.0;
  }

  private double Mu(double Ma, double fds, double phi, double L, double t)
  {
    double result = (2 * Ma) / (fds * 1000 * phi * Math.Pow(L, 2) * t);
    return (result >= 1) ? 1 : result;
  }

  private double LcReinf(double Mu, double L)
  {
    return (Mu == 1) ? L : L * (1 - Math.Sqrt(1 - Mu));
  }

  private double D(double L)
  {
    double result = L - 2 * 0.2;
    return (result > 0) ? result : L;
  }

  private double E_su(double E_mu, double d, double Lc, double fyd)
  {
    double result = E_mu * (d - 1.25 * Lc) / (1.25 * Lc);
    return (result > 0) ? Math.Min(result, fyd / 200000.0) : fyd / 200000.0;
  }

  private double Asv_calc(double Lc, double t, double phi, double fds, double N, double E_su)
  {
    return Math.Abs((Lc * t * phi * fds - N / 1000.0) / (200000.0 * E_su));
  }

  private double Asv(double Asv_calc, double Asv_min)
  {
    return Math.Max(Asv_calc, Asv_min);
  }

  private double sigma_d(double N, double My, double L, double t)
  {
    return (N + My / L) / (L * t) / 1000.0;
  }

  private double ratio1(double sigma_d, double fds)
  {
    return sigma_d / fds;
  }

  private double dtr(double t)
  {
    return t + 0.01;
  }

  private double z(double dtr, double Asv, double fyd, double L, double nf, double fds)
  {
    double val = dtr * (1 - 0.5 * Asv * fyd / (L * dtr * nf * fds));
    return Math.Min(val, 0.9 * dtr);
  }

  private double Mrd(double Asv, double fyd, double z)
  {
    return Asv * 1000 * fyd * z;
  }

  private double ratio2(double Mz, double Mrd)
  {
    return Mz / Mrd;
  }

  private double fvk_reinf(double fvk0, double d, double fb)
  {
    return Math.Min(fvk0 + 0.4 * d, 0.065 * fb);
  }

  private double fvd_reinf(double fvk, double gamma_Ms)
  {
    return fvk / gamma_Ms;
  }

  private double Vrd1_reinf(double fvd, double d, double t)
  {
    return Math.Max(fvd * t * d * 1000, 0);
  }

  private double ratio3(double Vrd1, double Vz)
  {
    return (Vz / Vrd1) * 100;
  }

  private double Asw_min_reinf(double t, double Heff)
  {
    return 0.0005 * t * Heff;
  }

  private int n_reinf(double Heff, double t)
  {
    return (int)Math.Floor(Heff / t + 1);
  }

  private double Asw_reinf(double Asw_min, int n)
  {
    return Asw_min / n;
  }

  private double smax_reinf(double t)
  {
    return Math.Min(t, 0.6);
  }

  private double d2_reinf(double Heff)
  {
    return 0.95 * Heff;
  }

  private double Vrd2_reinf(double Asw, double fyd, double d2, double smax)
  {
    return 1000 * 0.6 * Asw * fyd * d2 / smax;
  }

  private double check1_reinf(double Vrd1, double Vrd2)
  {
    return Vrd1 + Vrd2;
  }

  private double check2_reinf(double fds, double t, double d2)
  {
    return 1000 * 0.3 * fds * t * d2;
  }

  private double ratio4_reinf(double Vz, double Vrd1, double Vrd2)
  {
    return Vz / (Vrd1 + Vrd2);
  }

  private double As_reinf(double Asv)
  {
    return Asv * 10000;
  }

  private double As2_reinf(double Asw_min, double d)
  {
    return (Asw_min / d) * 1000;
  }

  private double As3_reinf(double Asw, double E_mu)
  {
    return (Asw / E_mu) * 1000;
  }

  // The following helper methods for the unreinforced module are assumed to be defined already:
  private double Einit(double h_eff)
  {
    return h_eff / 450.0;
  }
  #endregion
}