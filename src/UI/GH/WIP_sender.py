import Rhino.Geometry as rg
import Grasshopper
import scriptcontext as sc
from System.Drawing import PointF
from System import Decimal
import Karamba
import System

# If needed, adjust for your actual Karamba Param import:
# e.g. from Karamba.GHopper.Materials import Param_FemMaterial, GH_FemMaterial
# or from Karamba.GHopper.Param import Param_Material, GH_Material
# depending on your Karamba version.
from Grasshopper.Kernel.Parameters import Param_Brep
from Grasshopper.Kernel.Special import GH_NumberSlider
from Grasshopper.Kernel.Types import GH_Brep
# from Karamba.GHopper.Materials import Param_FemMaterial, GH_FemMaterial
# from Karamba.Materials import FemMaterial_Isotrop, FemMaterial

class MyComponent:

    @staticmethod
    def RunScript(gh_doc, component):
        """Combined logic from sender.py and kar_sender.py."""

        # ---------------------------------------------------------------------
        # 1. Retrieve the EFM data from sticky and our tracking set
        # ---------------------------------------------------------------------
        EFM = sc.sticky.get("EFM", {})
        sender_components = sc.sticky.get("sender_components", set())

        # ---------------------------------------------------------------------
        # PART A: Handle geometry “Elements” (from EFM["GeomDict"]["Elements"])
        # ---------------------------------------------------------------------
        geom_dict = EFM.get("GeomDict", {})
        elements = geom_dict.get("Elements", [])
        current_element_names = {elem["name"] for elem in elements}

        # -- A1) Remove geometry-related GH objects for elements no longer in EFM
        objects_to_remove = []
        for obj in gh_doc.Objects:
            if obj.NickName in sender_components:
                # If it’s a Brep param, or a slider named “*_Thickness”
                if isinstance(obj, Param_Brep):
                    if obj.NickName not in current_element_names:
                        objects_to_remove.append(obj)
                elif isinstance(obj, GH_NumberSlider):
                    base_name = obj.NickName.replace("_Thickness", "")
                    if base_name not in current_element_names:
                        objects_to_remove.append(obj)

        for obj in objects_to_remove:
            sender_components.remove(obj.NickName)
            gh_doc.RemoveObject(obj, False)

        # -- A2) Gather existing nicknames and find max_y for geometry column
        existing_nicknames = set()
        max_y_geom = 200  # to track how far down we place new items
        y_spacing = 80
        for obj in gh_doc.Objects:
            existing_nicknames.add(obj.NickName)
            # track the pivot’s Y so we can place new items below
            obj_bottom = obj.Attributes.Pivot.Y
            max_y_geom = max(max_y_geom, obj_bottom) - y_spacing

        # -- A3) For each element, create a Brep Param and a Thickness Slider if needed
        xPos_geom = 100
        yPos_geom = max_y_geom + y_spacing

        for i, elem in enumerate(elements):
            elem_name = elem["name"]
            elem_thickness = elem["thickness"]
            elem_geometries = elem["geometries"]  # Rhino surfaces

            # If the param doesn’t exist yet:
            if elem_name not in existing_nicknames:
                geo_param = Param_Brep()
                geo_param.Name = elem_name
                geo_param.NickName = elem_name
                geo_param.Description = "Holds geometry for " + elem_name
                geo_param.CreateAttributes()

                yPos_geom += y_spacing
                geo_param.Attributes.Pivot = PointF(xPos_geom, yPos_geom)

                # Add each geometry as persistent data
                geo_param.PersistentData.ClearData()
                for srf in elem_geometries:
                    face_brep = srf.DuplicateFace(True)  # single-face Brep
                    gh_face_brep = GH_Brep(face_brep)
                    geo_param.PersistentData.Append(gh_face_brep)

                gh_doc.AddObject(geo_param, False)
                existing_nicknames.add(elem_name)
                sender_components.add(elem_name)

            # Also create thickness slider if needed
            slider_name = f"{elem_name}_Thickness"
            if slider_name not in existing_nicknames:
                slider = GH_NumberSlider()
                slider.Name = slider_name
                slider.NickName = slider_name
                slider.Slider.Minimum = Decimal(0.0)
                slider.Slider.Maximum = Decimal(10000.0)
                slider.Slider.Value = Decimal(elem_thickness)
                slider.CreateAttributes()

                slider.Attributes.Pivot = PointF(xPos_geom + 150, yPos_geom)
                gh_doc.AddObject(slider, False)

                existing_nicknames.add(slider_name)
                sender_components.add(slider_name)

                # Move down for next element
                yPos_geom += y_spacing

        # ---------------------------------------------------------------------
        # PART B: Handle Materials (from EFM["MatDict"]["Materials"])
        # ---------------------------------------------------------------------
        mat_dict = EFM.get("MatDict", {})
        materials_list = mat_dict.get("Materials", [])
        mat_names_set = {mat.get("name", "") for mat in materials_list}

        # -- B1) Remove old material GH params that no longer exist in EFM
        objects_to_remove = []
        for obj in gh_doc.Objects:
            if obj.NickName in sender_components:
                # If the NickName is not in the current set of materials, remove it
                if obj.NickName not in mat_names_set:
                    objects_to_remove.append(obj)

        for obj in objects_to_remove:
            sender_components.remove(obj.NickName)
            gh_doc.RemoveObject(obj, False)

        # -- B2) Gather existing nicknames (already have “existing_nicknames” above).
        #        Find max_y for materials column
        max_y_mats = 200
        for obj in gh_doc.Objects:
            obj_bottom = obj.Attributes.Pivot.Y
            max_y_mats = max(max_y_mats, obj_bottom) - y_spacing

        # -- B3) Create Karamba Material params if not already in GH
        xPos_mats = 500
        yPos_mats = max_y_mats + y_spacing

        for i, mat_data in enumerate(materials_list):
            mat_name = mat_data.get("name", f"Material_{i}")
            if not mat_name:
                continue

            # Skip if already exists
            if mat_name in existing_nicknames:
                continue

            # Hypothetical Karamba param for materials
            # e.g. Param_FemMaterial from Karamba.GHopper.Materials
            param_mat = Karamba.GHopper.Materials.Param_FemMaterial() 
            param_mat.Name = mat_name
            param_mat.NickName = mat_name
            param_mat.Description = "Karamba material for " + mat_name
            param_mat.CreateAttributes()

            yPos_mats += y_spacing
            param_mat.Attributes.Pivot = PointF(xPos_mats, yPos_mats)

            # Example of constructing a Karamba material from dict:
            # Make sure these keys and data match your actual EFM data
            mat_color = mat_data.get("Color", "")
            actual_karamba_mat = Karamba.Materials.FemMaterial_Isotrop(
                mat_data.get("Family", f"Material_{i}"),
                mat_data.get("Name", f"Material_{i}"),
                mat_data.get("E", 0.0),
                mat_data.get("G_in-plane", 0.0),
                mat_data.get("G_transverse", 0.0),
                mat_data.get("gamma", 0.0),
                mat_data.get("ft", 0.0),
                mat_data.get("fc", 0.0),
                Karamba.Materials.FemMaterial.FlowHypothesisFromString(
                    mat_data.get("FlowHypothesis", "mises")
                ),
                mat_data.get("alphaT", 0.0),
                # Convert color name/string to a System.Drawing.Color
                # If needed, fallback to Color.White or any default
                System.Drawing.Color.FromName(mat_color) 
                if mat_color else System.Drawing.Color.White
            )

            param_mat.PersistentData.ClearData()
            param_mat.PersistentData.Append(
                Karamba.GHopper.Materials.GH_FemMaterial(actual_karamba_mat)
            )

            gh_doc.AddObject(param_mat, False)
            existing_nicknames.add(mat_name)
            sender_components.add(mat_name)

        # ---------------------------------------------------------------------
        # 2. Save updated “sender_components” and schedule a solution
        # ---------------------------------------------------------------------
        sc.sticky["sender_components"] = sender_components

        def on_solution_end(doc):
            doc.NewSolution(False)

        gh_doc.ScheduleSolution(1, on_solution_end)

        # Optionally return something:
        return {
            "Elements": elements,
            "Materials": materials_list
        }
