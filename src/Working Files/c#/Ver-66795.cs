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
public abstract class Script_Instance_66795 : GH_ScriptInstance
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
  private void RunScript(bool switchFlag, object Model_in, List<string> beamId, double L, double stone_thk, double h_eff, double fb, double fds, double gammaMs, double fvk0, ref object gLC, ref object gPhi, ref object gVz, ref object gMz, ref object gMy, ref object gN, ref object oL, ref object oStoneThk, ref object oHeff, ref object oFb, ref object oFds, ref object oGammaMs, ref object oFvk0)
  {
    var model = Model_in as Karamba.Models.Model;

    // Positions along the element (0.0 = start, 1.0 = end)
    List<double> ts = new List<double> { 0.0, 1.0 };


    List<BeamForceOutput> outputsLC6 = KarBeamForces(Model_in, beamId, "LC6");

    // Create lists to store the extracted force components
    List<double> nEd_LC6 = outputsLC6.Select(output => output.N ?? 0).ToList();
    List<double> mEd_LC6 = outputsLC6.Select(output => output.My ?? 0).ToList();

    // Nodal displacemnets 
    List<double> yTrans_LC1 = new List<double>();
    KarNodalDisp(Model_in, beamId, "LC1", ref yTrans_LC1);

    // Create lists to store the extracted force components
    List<BeamForceOutput> outputsLC1 = KarBeamForces(Model_in, beamId, "LC1");
    List<double> n_LC1 = outputsLC1.Select(output => output.N ?? 0).ToList();
    List<double> vZ_LC1 = outputsLC1.Select(output => output.Vz ?? 0).ToList();
    List<double> mY_LC1 = outputsLC1.Select(output => output.My ?? 0).ToList();
    List<double> mZ_LC1 = outputsLC1.Select(output => output.Mz ?? 0).ToList();

    // Nodal displacemnets 
    List<double> yTrans_LC2 = new List<double>();
    KarNodalDisp(Model_in, beamId, "LC2", ref yTrans_LC2);

    // Create lists to store the extracted force components
    List<BeamForceOutput> outputsLC2 = KarBeamForces(Model_in, beamId, "LC2");
    List<double> n_LC2 = outputsLC2.Select(output => output.N ?? 0).ToList();
    List<double> vZ_LC2 = outputsLC2.Select(output => output.Vz ?? 0).ToList();
    List<double> mY_LC2 = outputsLC2.Select(output => output.My ?? 0).ToList();
    List<double> mZ_LC2 = outputsLC2.Select(output => output.Mz ?? 0).ToList();


    // Trigger to swicth the top and bottom values
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
    List<double> phiLC1 = new List<double>();

    bool boum_LC1 = Verification(top, bottom, mY_LC1, n_LC1, L, stone_thk, fvk0, gammaMs, fb, vZ_LC1, h_eff, mEd_LC6, nEd_LC6, yTrans_LC1, fds, ref verificationLC1, ref phiLC1);

    List<string> verificationLC2 = new List<string>();
    List<double> phiLC2 = new List<double>();


    bool boum_LC2 = Verification(top, bottom, mY_LC2, n_LC2, L, stone_thk, fvk0, gammaMs, fb, vZ_LC2, h_eff, mEd_LC6, nEd_LC6, yTrans_LC2, fds, ref verificationLC2, ref phiLC2);

    bool finalBoum = boum_LC1 || boum_LC2;

    int boumLC1_int = ToInt(boum_LC1);
    int boumLC2_int = ToInt(boum_LC2);

    string governingLC;
    List<double> governingPhi;
    List<double> governingVz;
    List<double> governingMz;
    List<double> governingMy;
    List<double> governingN;
    if (boumLC1_int > boumLC2_int)
    {
      governingLC = "LC1";
      governingPhi = phiLC1;
      governingVz = vZ_LC1;
      governingMz = mZ_LC1;
      governingMy = mY_LC1;
      governingN = n_LC1;

    }
    else
    {
      governingLC = "LC2";
      governingPhi = phiLC2;
      governingVz = vZ_LC2;
      governingMz = mZ_LC2;
      governingMy = mY_LC2;
      governingN = n_LC2;

    }
    gLC = governingLC;
    gPhi = governingPhi;
    gVz = governingVz;
    gMz = governingMz;
    gMy = governingMy;
    gN = governingN;
    oL = L;
    oStoneThk = stone_thk;
    oHeff = h_eff;
    oFb = fb;
    oFds = fds;
    oGammaMs = gammaMs;
    oFvk0 = fvk0;


  }
  #endregion
  #region Additional

  private int ToInt(bool value)
  {
    return value ? 1 : 0;
  }

  private List<int> BeamNodalInd(object Model_in, List<string> beamId)
  {
    var model = Model_in as Karamba.Models.Model;

    List<int> nodeIndices = new List<int>();


    // Access the beam element using its index
    List<ModelElement> beams = model.elementsByID(beamId);
    foreach (ModelElement beam in beams)
    {
      // Extract the start and end node indices
      nodeIndices.AddRange(beam.node_inds);

    }

    return nodeIndices;
  }

  //--------------------------------------------------------------------------------
  // 1) Calculate Nodal Displacements
  //--------------------------------------------------------------------------------
  private void KarNodalDisp(object Model_in, List<string> beamId, string resultSelection, ref List<double> ys)
  {

    var model = Model_in as Karamba.Models.Model;
    List<int> nodeIndices = BeamNodalInd(Model_in, beamId);

    List<List<Vector3>> trans;
    List<List<Vector3>> rotat;
    List<Point3> positions;
    List<List<Karamba.Loads.Combination.LoadCase>> governingLoadCases;
    List<List<int>> governingLoadCaseInds;

    NodeDisplacements.solve(
     model,
     resultSelection,
     nodeIndices,
     out trans,
     out rotat,
     out governingLoadCases,
     out governingLoadCaseInds,
     out positions
    );

    for (int i = 0; i < trans.Count; i++)
    {
      for (int j = 0; j < trans[i].Count; j++)
      {
        // Access the Y component of the translation vector
        double yComponent = trans[i][j].Y;
        ys.Add(yComponent);
      }
    }


  }
  //--------------------------------------------------------------------------------
  // 2) Calculate Beam Forces
  //--------------------------------------------------------------------------------
  public class BeamForceOutput
  {
    public double? N { get; set; }
    public double? Vy { get; set; }
    public double? Vz { get; set; }
    public double? Mt { get; set; }
    public double? My { get; set; }
    public double? Mz { get; set; }
  }
  private List<BeamForceOutput> KarBeamForces(object Model_in, List<string> beamId, string resultSelection)
  {
    var model = Model_in as Karamba.Models.Model;

    // Positions along the element (0.0 = start, 1.0 = end)
    // Output variables for the solve method
    List<List<List<Vector3>>> forces;
    List<List<List<Vector3>>> moments;
    List<List<List<Karamba.Loads.Combination.LoadCase>>> governingLoadCases;
    List<List<List<int>>> governingLoadCaseInds;
    List<int> elementInds;

    // Call the solve method
    BeamForces.solve(
      model,
      beamId,
      resultSelection,
      0,
      0,
      out forces,
      out moments,
      out governingLoadCases,
      out governingLoadCaseInds,
      out elementInds
    );

    // Create a list to hold the results for each element/position
    List<BeamForceOutput> outputs = new List<BeamForceOutput>();

    // Iterate over the nested lists to extract force components
    for (int i = 0; i < forces.Count; i++)
    {
      // For each element
      for (int j = 0; j < forces[i].Count; j++)
      {
        // For each position along the element (ts)
        // Assuming only one load case, so index 0
        Vector3 forceVec = forces[i][j][0];
        Vector3 momentVec = moments[i][j][0];

        BeamForceOutput result = new BeamForceOutput();

        // Decide which outputs to populate based on load case or other logic.
        // For example, if you want to output axial force and shear only:
        result.N = forceVec.X;

        // Shear forces Vy and Vz (local y and z-directions)
        result.Vy = forceVec.Y;
        result.Vz = forceVec.Z;

        // Torsional moment Mt (around local x-axis)
        result.Mt = momentVec.X;

        // Bending moments My and Mz (around local y and z-axes)
        result.My = momentVec.Y;
        result.Mz = momentVec.Z;
        
        outputs.Add(result);
      }
    }
    return outputs;
  }
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
  // 5) Verification Module
  //--------------------------------------------------------------------------------

  private bool Verification(int top, int bottom,
        List<double> _m_y,
        List<double> _n,
        double L,
        double stone_thk,
        double fvk_0,
        double gamma_ms,
        double fb,
        List<double> _v_z,
        double h_eff,
        List<double> m_ed,
        List<double> n_ed,
        List<double> node_disp,
        double fds, 
        ref List<string> verStrings, 
        ref List<double> phiList)
  {

    // Convert force lists to absolute values.
    List<double> n = Absolute(_n);
    List<double> v_z = Absolute(_v_z);
    List<double> m_y = Absolute(_m_y);

    double ma_bottom = Ma(m_y[bottom], n[bottom], L);
    double ma_top = Ma(m_y[top], n[top], L);
    double ea_bottom = Ea(ma_bottom, n[bottom]);
    double ea_top = Ea(ma_top, n[top]);
    double lc_bottom = Lc(L, ea_bottom);
    double lc_top = Lc(L, ea_top);
    double sigma_d_bottom = Sigma_D(lc_bottom, stone_thk, n[bottom]);
    double sigma_d_top = Sigma_D(lc_top, stone_thk, n[top]);

    double fvk_bottom = Fvk(fvk_0, sigma_d_bottom);
    double fvd_bottom = Fvd(fvk_bottom, gamma_ms, fb);
    var vrdTuple = Vrd(lc_bottom, fvd_bottom, stone_thk, v_z[bottom]);
    double? vrd_bottom = vrdTuple.Item1;
    double? vrd_false = vrdTuple.Item2;

    double phi_bottom = Phi(Ei_Bottom(stone_thk, m_ed[bottom], n_ed[bottom], Einit(h_eff), node_disp[bottom]), stone_thk);
    double phi_top = Phi(Ei_Top(stone_thk, m_ed[top], n_ed[top], Einit(h_eff), node_disp[top]), stone_thk);
    double mrd_bottom = MRd(n[bottom], L, stone_thk, phi_bottom, 1, fds);
    double mrd_top = MRd(n[top], L, stone_thk, phi_top, 1, fds);
    double nrd_bottom = NRd(phi_bottom, L, stone_thk, fds);
    double nrd_top = NRd(phi_top, L, stone_thk, fds);

    phiList = new List<double>();
    if (top != 0)
    {
      phiList.Add(phi_bottom);
      phiList.Add(phi_top);
    }
    else
    {
      phiList.Add(phi_top);
      phiList.Add(phi_bottom);
    }

    double Nb_p = (Math.Abs(n[bottom]) / Math.Abs(nrd_bottom)) * 100.0;
    if (Nb_p >= 100)
      verStrings.Add("Vérification locale en compression at the foot of the wall: not ok; " + Nb_p.ToString("F2") + "%");
    else
      verStrings.Add("Vérification locale en compression at the foot of the wall: ok; " + Nb_p.ToString("F2") + "%");

    double Mb_p = Math.Abs((m_y[bottom] / mrd_bottom) * 100.0);
    if (Mb_p >= 100)
      verStrings.Add("Local bending verification at the foot of the wall: not ok; " + Mb_p.ToString("F2") + "%");
    else
      verStrings.Add("Local bending verification at the foot of the wall: ok, " + Mb_p.ToString("F2") + "%");

    double Nt_p = Math.Abs((n[top] / nrd_top) * 100.0);
    if (Nt_p >= 100)
      verStrings.Add("Vérification locale en compression at the head of the wall: not ok; " + Nt_p.ToString("F2") + "%");
    else
      verStrings.Add("Vérification locale en compression at the head of the wall: ok; " + Nt_p.ToString("F2") + "%");

    double Mt_p = Math.Abs((m_y[top] / mrd_top) * 100.0);
    if (Mt_p >= 100)
      verStrings.Add("Local bending verification at the head of the wall: not ok; " + Mt_p.ToString("F2") + "%");
    else
      verStrings.Add("Local bending verification at the head of the wall: ok; " + Mt_p.ToString("F2") + "%");

    double check1 = Math.Abs((m_y[bottom] / n[bottom]) / (L - ea_bottom)) * 100.0;
    if ((m_y[bottom] / n[bottom]) < (L - ea_bottom))
      verStrings.Add("no tilting at the foot of the wall");
    else
      verStrings.Add("tilting at the foot of the wall");

    double check2 = Math.Abs((m_y[top] / n[top]) / (L - ea_top)) * 100.0;
    if ((m_y[top] / n[top]) < (L - ea_top))
      verStrings.Add("no tilting at the head of the wall");
    else
      verStrings.Add("tilting at the head of the wall");

    if (lc_bottom < L)
      verStrings.Add("partially compressed at the foot of the wall");
    else if (lc_bottom < 0)
      verStrings.Add("fully tensioned at the foot of the wall");
    else
      verStrings.Add("fully compressed at the foot of the wall");

    if (lc_top < L)
      verStrings.Add("partially compressed at the head of the wall");
    else if (lc_top < 0)
      verStrings.Add("fully tensioned at the head of the wall");
    else
      verStrings.Add("fully compressed at the head of the wall");

    if (Ei_Bottom(stone_thk, m_ed[bottom], n_ed[bottom], Einit(h_eff), node_disp[bottom]) >= 0.05 * stone_thk)
      verStrings.Add("Eccentricity at the foot of the wall: ok");
    else
      verStrings.Add("Eccentricity at the foot of the wall: not ok");

    if (Ei_Top(stone_thk, m_ed[top], n_ed[top], Einit(h_eff), node_disp[top]) >= 0.05 * stone_thk)
      verStrings.Add("Eccentricity at the head of the wall: ok");
    else
      verStrings.Add("Eccentricity at the head of the wall: not ok");

    verStrings.Add("v_z[bottom]: " + v_z[bottom].ToString() + ", vrd_bottom: " + (vrd_bottom.HasValue ? vrd_bottom.Value.ToString() : "null"));

    if (!vrd_bottom.HasValue || vrd_bottom.Value == 0)
    {
      verStrings.Add("Shear verification: not ok");
    }
    else
    {
      double V_p = Math.Abs((v_z[bottom] / vrd_bottom.Value) * 100.0);
      if (V_p >= 100)
        verStrings.Add("Shear verification: not ok; " + V_p.ToString("F2") + "%");
      else
        verStrings.Add("Shear verification: ok; " + V_p.ToString("F2") + "%");
    }

    double check3 = Math.Abs(sigma_d_top / fds) * 100.0;
    double check4 = Math.Abs(sigma_d_bottom / fds) * 100.0;

    bool boum = Boum(Mt_p, Mb_p, Nt_p, Nb_p, check1, check2, check3, check4);
    return boum;
  }

  // Helper methods (all declared as private for C# 5)
  private List<double> Absolute(List<double> toConvert)
  {
    List<double> result = new List<double>();
    foreach (double val in toConvert)
    {
      result.Add(Math.Abs(val));
    }
    return result;
  }

  private double Ma(double m_y_val, double n_val, double l)
  {
    return m_y_val + n_val * l / 2.0;
  }

  private double Ea(double ma, double n_val)
  {
    return ma / n_val;
  }

  private double Lc(double l, double ea)
  {
    return 2.0 * (l - ea);
  }

  private double Sigma_D(double lc, double stone_thk, double N_val)
  {
    return (N_val / 1000.0) / (stone_thk * lc);
  }

  private double Fvd(double fvk, double gamma_ms, double fb)
  {
    double result = fvk / gamma_ms;
    double check_value = fb * 0.065;
    if (result > check_value)
    {
      Print("fvd <= fb*0,065 is false");
    }
    return result;
  }

  private double Fvk(double fvk_0, double sigma_d)
  {
    return fvk_0 + sigma_d * 0.4;
  }

  private Tuple<double?, double?> Vrd(double lc, double fvd, double stone_thk, double Ved)
  {
    if (lc < 0)
    {
      return new Tuple<double?, double?>(0, null);
    }
    else
    {
      double result = fvd * lc * stone_thk * 1000.0;
      if (result > Ved)
      {
        return new Tuple<double?, double?>(result, null);
      }
      else
      {
        return new Tuple<double?, double?>(null, result);
      }
    }
  }

  private double NRd(double phi, double L, double stone_thk, double fds)
  {
    return phi * L * stone_thk * fds * 1000.0;
  }

  private double Phi(double ei, double stone_thk)
  {
    double result = 1 - 2 * ei / stone_thk;
    if (result < 0.1)
    {
      Print("phi < 0.1 is false");
    }
    return result;
  }

  private double MRd(double N_val, double L, double stone_thk, double phi, double eta, double fds)
  {
    return (N_val * L / 2.0) * (1 - N_val / (L * stone_thk * phi * eta * fds * 1000.0));
  }

  private double Einit(double h_eff)
  {
    return h_eff / 450.0;
  }

  private double Ei_Bottom(double stone_thk, double m_ed, double n_ed, double einit, double pDecon)
  {
    return Math.Abs(m_ed / n_ed) + einit + pDecon;
  }

  private double Ei_Top(double stone_thk, double m_ed, double n_ed, double einit, double pDecon)
  {
    return Math.Abs(m_ed / n_ed) + einit + pDecon;
  }

  private bool Boum(double Mt_p, double Mb_p, double Nt_p, double Nb_p, double check1, double check2, double check3, double check4)
  {
    if (Mt_p > 100 || Mb_p > 100 || Nt_p > 100 || Nb_p > 100 ||
        check1 > 100 || check2 > 100 || check3 > 100 || check4 > 100)
      return true;
    else
      return false;
  }
  #endregion
}