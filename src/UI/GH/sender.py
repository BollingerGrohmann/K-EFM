import Rhino.Geometry as rg
from Grasshopper.Kernel.Parameters import Param_Geometry, Param_Brep
from Grasshopper.Kernel.Special import GH_NumberSlider
from Grasshopper.Kernel.Data import GH_Path
from Grasshopper.Kernel.Types import GH_Brep
import Grasshopper  
import scriptcontext as sc
import Karamba 


from System.Drawing import PointF
from System import Decimal
from System.Drawing import Color


def connect_by_nicknames(gh_doc, source_nickname, source_output_index, target_nickname, target_input_index):
    """
    Connect the object named `source_nickname`'s output at `source_output_index`
    to the object named `target_nickname`'s input at `target_input_index`.
    Both source and target are identified by their .NickName in gh_doc.Objects.
    """
    source_obj = None
    target_obj = None
    
    # 1. Locate the objects in the GH document
    for obj in gh_doc.Objects:
        if obj.NickName == source_nickname:
            source_obj = obj
        if obj.NickName == target_nickname:
            target_obj = obj
    
    # 2. Only proceed if both exist
    if not source_obj or not target_obj:
        return  # Could optionally print an error or raise an exception

    # 3. Figure out how to get the correct "output" from the source
    #    - If the source is a GH_Component, it has `source_obj.Params.Output[]`.
    #    - If the source is a param (Param_Brep, Param_Curve, etc.), it typically has no "Params" property.
    #      In Grasshopper, param objects themselves act as the "source" you can connect from.

    if hasattr(source_obj, "Params"):
        # It's a component with multiple outputs
        # We'll assume it has an output at `source_output_index`
        if source_output_index < len(source_obj.Params.Output):
            source_output_param = source_obj.Params.Output[source_output_index]
        else:
            return  # Index out of range; do nothing
    else:
        # It's a param, so we connect directly from it as the "source"
        source_output_param = source_obj  # use the param object itself

    # 4. Connect that source to the target's input at `target_input_index`
    if hasattr(target_obj, "Params"):
        # It's also a component, so it has `Params.Input[]`
        if target_input_index < len(target_obj.Params.Input):
            target_obj.Params.Input[target_input_index].AddSource(source_output_param)
    else:
        # If the target is a param, we connect via `AddSource(...)`
        target_obj.AddSource(source_output_param)

    
class MyComponent:

    @staticmethod
    def RunScript(gh_doc, component):
        # 1. Retrieve the EFM data from sticky
        EFM = sc.sticky.get("EFM", {})

        sender_components = sc.sticky.get("sender_components", set())
        
        # Check if "GeomDict" -> "Elements" structure exists
        if ("GeomDict" not in EFM) or ("Elements" not in EFM["GeomDict"]):
            return []  # Nothing to place

        elements = EFM["GeomDict"]["Elements"]

        # Get set of current element names from EFM
        current_element_names = {elem["name"] for elem in elements}
        
        # Remove components for elements that no longer exist
        objects_to_remove = []
        for obj in gh_doc.Objects:
            if obj.NickName in sender_components:  # Only check components we created
                if isinstance(obj, Param_Brep):
                    if obj.NickName not in current_element_names:
                        objects_to_remove.append(obj)
                elif isinstance(obj, GH_NumberSlider):
                    base_name = obj.NickName.replace("_Thickness", "")
                    if base_name not in current_element_names:
                        objects_to_remove.append(obj)



        for obj in objects_to_remove:
            sender_components.remove(obj.NickName)  # Remove from our tracking set
            gh_doc.RemoveObject(obj, False)
        
        # 2. Read existing GH nicknames so we don't duplicate
        existing_nicknames = set()

        max_y = 535  # Default starting Y position
        y_spacing = 100

        for obj in gh_doc.Objects:
            if isinstance(obj, (Param_Brep, GH_NumberSlider)):
                existing_nicknames.add(obj.NickName)
                # Update max_y if this component is lower
                obj_bottom = obj.Attributes.Pivot.Y
                max_y = max(max_y, obj_bottom) 

        # 3. For each element, create geometry param + slider if needed
        xPos = 900  # Starting X on canvas
        # yPos = max_y + y_spacing  # Start below the lowest existing component


        for i, elem in enumerate(elements):
            elem_name = elem["name"]
            elem_thickness = elem["thickness"]
            elem_geometries = elem["geometries"]  # Actual Rhino surfaces in memory

            path = GH_Path(i)

            if i == 0:
                yPos = max_y  # Reset Y for the first element
            else:  
                yPos = max_y + y_spacing * i

            # --- A) Param_Geometry for the element ---
            if elem_name not in existing_nicknames:
                geo_param = Param_Brep()
                #geo_param = Param_Geometry()
                geo_param.Name = elem_name
                geo_param.NickName = elem_name
                geo_param.Description = "Holds geometry for " + elem_name
                geo_param.CreateAttributes()
                
                geo_param.Attributes.Pivot = PointF(xPos, yPos)

                yPos += y_spacing  # Shift downward for the next item

                # Instead of VolatileData:
                geo_param.PersistentData.ClearData()
                for j, srf in enumerate(elem_geometries):
                    # 1) Duplicate as trimmed single-face brep
                    face_brep = srf.DuplicateFace(True) 
                    # 2) Wrap in GH_Brep
                    gh_face_brep = GH_Brep(face_brep)


                    #geo_param.AddVolatileData(path, j, gh_brep)
                    geo_param.PersistentData.Append(gh_face_brep)
                gh_doc.AddObject(geo_param, False)

                #ConnectComponents(geo_param, gh_doc)  # Connect to the target component if needed
                
                existing_nicknames.add(elem_name)
                
                sender_components.add(elem_name) 

            slider_incr = 0
            # --- B) GH_NumberSlider for the thickness ---
            slider_name = f"{elem_name}_Thickness"
            if slider_name not in existing_nicknames:
                slider = GH_NumberSlider()
                slider.Name = slider_name
                slider.NickName = slider_name
                slider.Slider.Minimum = Decimal(0.0)
                slider.Slider.Maximum = Decimal(100.0)
                slider.Slider.Value = Decimal(elem_thickness)
                slider.CreateAttributes()
                
                yPos += y_spacing  # Shift for the next item
                # yPos = yPos + slider_incr * i  # Adjust Y position for the slider

                slider.Attributes.Pivot = PointF(xPos, yPos + 100) # Place beside the geometry param

                gh_doc.AddObject(slider, False)
                existing_nicknames.add(slider_name)

                sender_components.add(slider_name) 

            # Save our component tracking list back to sticky
            sc.sticky["sender_components"] = sender_components

# ----------------------------------------------------------------------
# Material
# ----------------------------------------------------------------------
    
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

        for obj in gh_doc.Objects:
            existing_nicknames.add(obj.NickName)
            # If you want to shift new items below existing items,
            # track the highest `Pivot.Y` among them
            obj_bottom = obj.Attributes.Pivot.Y

            max_y = max(max_y, obj_bottom) - y_spacing
        
        # 2D. For each material in materials_list, create a Param
        #m_xPos = xPos  # some X offset different from geometry
        # m_yPos = max_y + y_spacing

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

            yPos += y_spacing

            param_mat.Attributes.Pivot = PointF(xPos, yPos + 100)
            
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

        connections_to_make = [
            ("Stone Walls", 0, "_Stone Walls", 1),
            ("Concrete Walls", 0, "_Concrete Walls", 1),
            ("Floors", 0, "_Floors", 1),
            # etc...
        ]

        for src_name, src_out, tgt_name, tgt_in in connections_to_make:
            connect_by_nicknames(gh_doc, src_name, src_out, tgt_name, tgt_in)

        # 4. Force Grasshopper to finalize layout
        def on_solution_end(doc):
            doc.NewSolution(False)

        gh_doc.ScheduleSolution(1, on_solution_end)
        
        return elements

