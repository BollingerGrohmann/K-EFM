import Rhino.Geometry as rg
from Grasshopper.Kernel.Parameters import Param_Brep
from Grasshopper.Kernel.Special import GH_NumberSlider
from Grasshopper.Kernel.Data import GH_Path
from Grasshopper.Kernel.Types import GH_Brep
import Grasshopper  
import scriptcontext as sc
import Karamba 

from System.Drawing import PointF
from System import Decimal
from System.Drawing import Color

# -------------- IMPORT KARAMBA --------------
# This is hypothetical. Adjust for your Karamba version.
# For example:
# from Karamba.GHopper.Param import Param_Material

class MyComponent:
    
    @staticmethod
    def RunScript(gh_doc, component):
        # 1. Retrieve the EFM data from sticky
        EFM = sc.sticky.get("EFM", {})

        # We’ll keep track of which GH objects we created so we can remove them if needed
        mat_sender_components = sc.sticky.get("mat_sender_components", set())

        # ---------- PART A: “Elements” the user already has -----------
        # (if you still need to do the geometry + slider logic)

        # ---------- PART B: “Materials” from EFM["MatDict"]["Materials"] -----------
        # 2A. Check if we have EFM["MatDict"] -> "Materials"
        if "MatDict" not in EFM or "Materials" not in EFM["MatDict"]:
            return []  # no materials to place

        materials_list = EFM["MatDict"]["Materials"]

        # Make a set of the current material names so we can remove no-longer-existing GH objects
        mat_names_set = {mat["name"] for mat in materials_list}

        # 2B. Remove GH params for materials that no longer exist
        objects_to_remove = []
        for obj in gh_doc.Objects:
            if obj.NickName in mat_sender_components:
                # Suppose we named them EXACTLY the material’s name
                # and we know they are Param_Material
                # If that name is not in mat_names_set, remove it
                # Also handle any other param we might have created
                base_nickname = obj.NickName
                if base_nickname not in mat_names_set:
                    objects_to_remove.append(obj)

        for obj in objects_to_remove:
            mat_sender_components.remove(obj.NickName)
            gh_doc.RemoveObject(obj, False)

        # 2C. Check existing nicknames to avoid duplicates
        existing_nicknames = set()
        max_y = 200
        y_spacing = 80

        for obj in gh_doc.Objects:
            existing_nicknames.add(obj.NickName)
            # If you want to shift new items below existing items,
            # track the highest `Pivot.Y` among them
            obj_bottom = obj.Attributes.Pivot.Y
            max_y = max(max_y, obj_bottom) - y_spacing
        
        # 2D. For each material in materials_list, create a Param
        xPos = 500  # some X offset different from geometry
        yPos = max_y + y_spacing

        for i, mat_data in enumerate(materials_list):
            mat_name = mat_data.get("name", f"Material_{i}")

            # If we do NOT want to re-create it if it already exists in GH:
            if mat_name in existing_nicknames:
                continue

            # 2E. Create the Karamba material param
            # Hypothetical API - adjust for your Karamba version
            param_mat = Karamba.GHopper.Materials.Param_FemMaterial() # or the correct param type
            param_mat.Name = mat_name
            param_mat.NickName = mat_name
            param_mat.Description = "Karamba material for " + mat_name
            param_mat.CreateAttributes()

            # Place it in the GH canvas
            yPos += y_spacing
            param_mat.Attributes.Pivot = PointF(xPos, yPos)
            
            if "Color" not in mat_data:
                continue
            mat_color = mat_data["Color"]
            actual_karamba_mat = Karamba.Materials.FemMaterial_Isotrop(
                mat_data.get("Family", f"Material_{i}"),
                mat_data.get("Name", f"Material_{i}"),
                mat_data.get("E", f"Material_{i}"),
                mat_data.get("G_in-plane", f"Material_{i}"),
                mat_data.get("G_transverse", f"Material_{i}"),
                mat_data.get("gamma", f"Material_{i}"),
                mat_data.get("ft", f"Material_{i}"),
                mat_data.get("fc", f"Material_{i}"),
                Karamba.Materials.FemMaterial.FlowHypothesisFromString(mat_data.get("FlowHypothesis", f"Material_{i}")),
                mat_data.get("alphaT", f"Material_{i}"),
                Color.FromName(mat_color) if mat_color else Color.White
                ) 
            
            # Then we wrap that in a GH-material type if needed:
            param_mat.PersistentData.ClearData()
            param_mat.PersistentData.Append(Karamba.GHopper.Materials.GH_FemMaterial(actual_karamba_mat))

            # But if you only want an empty param, skip the above.

            gh_doc.AddObject(param_mat, False)
            existing_nicknames.add(mat_name)
            mat_sender_components.add(mat_name)

        # Save back the updated set
        sc.sticky["mat_sender_components"] = mat_sender_components

        # Force GH to finalize layout
        def on_solution_end(doc):
            doc.NewSolution(False)

        gh_doc.ScheduleSolution(1, on_solution_end)
        
        # Return if you want – e.g. the current materials list
        return materials_list
